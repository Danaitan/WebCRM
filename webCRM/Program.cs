
// using System.Net.Http.Headers;
// using webCRM.Services;
// var builder = WebApplication.CreateBuilder(args);

// builder.Services.AddControllersWithViews();

// builder.Services.AddHttpContextAccessor();

// builder.Services.AddSession(options =>
// {
//     options.IdleTimeout = TimeSpan.FromHours(24);
//     options.Cookie.HttpOnly = true;
//     options.Cookie.IsEssential = true;
// });

// var apiDomain = Environment.GetEnvironmentVariable("ApiSettings__APIDomain");
// var bearerToken = Environment.GetEnvironmentVariable("ApiSettings__BearerToken");

// if (string.IsNullOrWhiteSpace(apiDomain))
// {
//     throw new InvalidOperationException("ApiSettings:APIDomain is not configured.");
// }

// if (string.IsNullOrWhiteSpace(bearerToken))
// {
//     throw new InvalidOperationException("ApiSettings:BearerToken is not configured.");
// }

// // Logs every outbound CRM API call to LOG_URL.
// builder.Services.AddTransient<CrmApiLoggingHandler>();

// var httpClientBuilder = builder.Services.AddHttpClient("CRMApi", client =>
// {
//     client.BaseAddress = new Uri($"{apiDomain.TrimEnd('/')}/crm/api/v1/");
//     client.Timeout = TimeSpan.FromSeconds(30);
//     client.DefaultRequestHeaders.Authorization =
//         new AuthenticationHeaderValue("Bearer", bearerToken);
// })
// .AddHttpMessageHandler<CrmApiLoggingHandler>();

// var isCheckCert = string.Equals(
//     Environment.GetEnvironmentVariable("isCheckCert"),
//     "true",
//     StringComparison.OrdinalIgnoreCase);

// if (!isCheckCert)
// {
//     httpClientBuilder.ConfigurePrimaryHttpMessageHandler(() =>
//     {
//         return new HttpClientHandler
//         {
//             ServerCertificateCustomValidationCallback =
//                 HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
//         };
//     });
// }

// builder.Services.AddScoped<CRMService>();
// var app = builder.Build();

// app.MapGet("/api/config", () =>
// {
//     return new
//     {
//         ETL_URL = Environment.GetEnvironmentVariable("ETL_URL")
//     };
// });
        
// // Configure the HTTP request pipeline.
// if (!app.Environment.IsDevelopment())
// {
//     app.UseExceptionHandler("/Home/Error");
//     app.UseHsts();
// }

// var defaultCulture =
//     new System.Globalization.CultureInfo("th-TH");

// var localizationOptions =
//     new RequestLocalizationOptions
//     {
//         DefaultRequestCulture =
//             new Microsoft.AspNetCore.Localization.RequestCulture(
//                 defaultCulture),

//         SupportedCultures = new[] { defaultCulture },

//         SupportedUICultures = new[] { defaultCulture }
//     };

// System.Globalization.CultureInfo.DefaultThreadCurrentCulture =
//     defaultCulture;

// System.Globalization.CultureInfo.DefaultThreadCurrentUICulture =
//     defaultCulture;

// app.UseRequestLocalization(localizationOptions);

// app.UseStaticFiles();

// // app.UseHttpsRedirection();

// app.UseRouting();

// app.UseSession();

// app.UseAuthorization();

// app.MapControllerRoute(
//     name: "default",
//     pattern: "{controller=Login}/{action=Index}/{id?}");

// app.Run();

using System.Net;
using System.Net.Http.Headers;

using Microsoft.AspNetCore.HttpOverrides;

using webCRM.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();

builder.Services.AddHttpContextAccessor();

var pathBase = Environment.GetEnvironmentVariable("PathBase") ?? "/crmweb";

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor
        | ForwardedHeaders.XForwardedProto
        | ForwardedHeaders.XForwardedHost;

    //options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromHours(24);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

var apiDomain = Environment.GetEnvironmentVariable("ApiSettings__APIDomain");
var bearerToken = Environment.GetEnvironmentVariable("ApiSettings__BearerToken");

if (string.IsNullOrWhiteSpace(apiDomain))
{
    throw new InvalidOperationException(
        "ApiSettings:APIDomain is not configured.");
}

if (string.IsNullOrWhiteSpace(bearerToken))
{
    throw new InvalidOperationException(
        "ApiSettings:BearerToken is not configured.");
}

builder.Services.AddTransient<CrmApiLoggingHandler>();

var isCheckCert = string.Equals(
    Environment.GetEnvironmentVariable("isCheckCert"),
    "true",
    StringComparison.OrdinalIgnoreCase);

var httpClientBuilder = builder.Services
    .AddHttpClient("CRMApi", client =>
    {
        client.BaseAddress =
            new Uri($"{apiDomain.TrimEnd('/')}/crm/api/v1/");

        client.Timeout = TimeSpan.FromSeconds(30);

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", bearerToken);
    })
    .ConfigurePrimaryHttpMessageHandler((sp) =>
    {
        var connLogger = sp
            .GetRequiredService<ILoggerFactory>()
            .CreateLogger("CRMApi.Connect");

        var handler = new SocketsHttpHandler
        {
            UseProxy = false,
            AllowAutoRedirect = true,

            // reuse connection: ไม่เปิด TCP+TLS ใหม่ทุก request
            PooledConnectionLifetime = TimeSpan.FromMinutes(10),
            PooledConnectionIdleTimeout = TimeSpan.FromMinutes(2),
            MaxConnectionsPerServer = 50,

            // กันค้างตอนต่อ (เช่น IPv6 fallback) ไม่เกิน 5 วินาที
            ConnectTimeout = TimeSpan.FromSeconds(5)
        };

        // [DEBUG] วัดเวลา "เปิด connection" แยก DNS resolve กับ TCP connect
        // callback นี้ถูกเรียก "เฉพาะตอนต้องเปิด connection ใหม่"
        // (ไม่ถูกเรียกเมื่อ reuse connection เดิมจาก pool)
        // => ถ้าเห็น log นี้โผล่บ่อย = connection ไม่ถูก reuse
        // => ถ้า dnsMs หรือ connectMs สูง = คอขวดอยู่ที่ DNS หรือ TCP/TLS
        handler.ConnectCallback = async (ctx, ct) =>
        {
            string hostName = ctx.DnsEndPoint.Host;
            int port = ctx.DnsEndPoint.Port;

            var swDns = System.Diagnostics.Stopwatch.StartNew();

            System.Net.IPAddress[] addresses =
                await System.Net.Dns.GetHostAddressesAsync(hostName, ct);

            swDns.Stop();
            long dnsMs = swDns.ElapsedMilliseconds;

            var swConn = System.Diagnostics.Stopwatch.StartNew();

            var socket = new System.Net.Sockets.Socket(
                System.Net.Sockets.SocketType.Stream,
                System.Net.Sockets.ProtocolType.Tcp)
            {
                NoDelay = true
            };

            Exception? connectError = null;
            System.Net.IPAddress? usedAddress = null;

            try
            {
                // ลองต่อทีละ address ตามลำดับที่ DNS คืนมา
                // (มักเป็น IPv6 ::1 ก่อน แล้วค่อย IPv4 127.0.0.1)
                // ทำให้เห็นว่าถ้า IPv6 ต่อไม่ได้ ต้องเสียเวลา fallback เท่าไร
                foreach (var addr in addresses)
                {
                    try
                    {
                        await socket.ConnectAsync(addr, port, ct);
                        usedAddress = addr;
                        break;
                    }
                    catch (Exception exAddr)
                    {
                        connectError = exAddr;
                        connLogger.LogWarning(
                            "[CONNECT] {Host}:{Port} addr={Addr} " +
                            "FAILED after {Ms}ms: {Err}",
                            hostName, port, addr,
                            swConn.ElapsedMilliseconds,
                            exAddr.Message);
                    }
                }

                if (usedAddress == null)
                {
                    socket.Dispose();
                    throw connectError
                        ?? new System.Net.Sockets.SocketException();
                }

                swConn.Stop();

                connLogger.LogWarning(
                    "[CONNECT] {Host}:{Port} OPENED NEW connection " +
                    "dns={DnsMs}ms connect={ConnectMs}ms " +
                    "addrCount={Count} usedAddr={Used}",
                    hostName, port, dnsMs,
                    swConn.ElapsedMilliseconds,
                    addresses.Length, usedAddress);

                return new System.Net.Sockets.NetworkStream(
                    socket, ownsSocket: true);
            }
            catch
            {
                socket.Dispose();
                throw;
            }
        };

        if (!isCheckCert)
        {
            // ปิด revocation check + ยอมรับ cert ใด ๆ (self-signed)
            handler.SslOptions.CertificateRevocationCheckMode =
                System.Security.Cryptography.X509Certificates
                    .X509RevocationMode.NoCheck;

            handler.SslOptions.RemoteCertificateValidationCallback =
                (sender, cert, chain, errors) => true;
        }

        return handler;
    })
    .AddHttpMessageHandler<CrmApiLoggingHandler>();

builder.Services.AddScoped<CRMService>();

var app = builder.Build();
app.UseForwardedHeaders();

if (!string.IsNullOrEmpty(pathBase))
{
    app.UsePathBase(pathBase);
}

app.MapGet("/api/config", () =>
{
    return new
    {
        ETL_URL = Environment.GetEnvironmentVariable("ETL_URL")
    };
});

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

var defaultCulture =
    new System.Globalization.CultureInfo("th-TH");

var localizationOptions =
    new RequestLocalizationOptions
    {
        DefaultRequestCulture =
            new Microsoft.AspNetCore.Localization.RequestCulture(
                defaultCulture),

        SupportedCultures = new[]
        {
            defaultCulture
        },

        SupportedUICultures = new[]
        {
            defaultCulture
        }
    };

System.Globalization.CultureInfo.DefaultThreadCurrentCulture =
    defaultCulture;

System.Globalization.CultureInfo.DefaultThreadCurrentUICulture =
    defaultCulture;

app.UseRequestLocalization(localizationOptions);

app.UseStaticFiles();

// app.UseHttpsRedirection();

app.UseRouting();

app.UseSession();

//app.Use(async (context, next) =>
//{
//    var sw = System.Diagnostics.Stopwatch.StartNew();
//    try
//    {
//        await context.Session.LoadAsync();
//        context.Items["sessionId"] = context.Session.Id;
//    }
//    catch
//    {
//        // ไม่ให้ debug code ทำ request พัง
//    }
//    finally
//    {
//        sw.Stop();
//        context.Items["sessionLoadMs"] = sw.ElapsedMilliseconds;
//    }

//    await next();
//});

app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Login}/{action=Index}/{id?}");

app.Run();