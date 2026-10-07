
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
    .ConfigurePrimaryHttpMessageHandler(() =>
    {
        // ใช้ SocketsHttpHandler เพื่อ:
        // 1) ปิด certificate revocation check (OCSP/CRL) อย่างชัดเจน
        //    HttpClientHandler เดิมบน Windows ยังพยายามเช็ค revocation
        //    ทางเครือข่ายก่อน แม้จะตั้ง DangerousAccept... แล้วก็ตาม
        //    ถ้าเครื่องเข้าถึง OCSP responder ไม่ได้ จะรอ timeout
        //    ~2 วินาทีต่อ TLS handshake -> ต้นเหตุที่ API call ช้า
        // 2) เปิด connection pooling/keep-alive ลด handshake ซ้ำ
        //    ในหน้าที่ยิงหลาย API call
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

app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Login}/{action=Index}/{id?}");

app.Run();