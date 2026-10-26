using System.Text.Json.Nodes;

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

    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromHours(24);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.Cookie.Path = "/";
    options.Cookie.SameSite = SameSiteMode.Lax;
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

builder.Services.AddHttpClient(ActivityLogService.HttpClientName, client =>
    {
        client.Timeout = TimeSpan.FromSeconds(4);
    })
    .ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
    {
        PooledConnectionLifetime = TimeSpan.FromMinutes(10),
        PooledConnectionIdleTimeout = TimeSpan.FromMinutes(2),
        MaxConnectionsPerServer = 20,
        ConnectTimeout = TimeSpan.FromSeconds(3),
        SslOptions =
        {
            CertificateRevocationCheckMode =
                System.Security.Cryptography.X509Certificates
                    .X509RevocationMode.NoCheck,
            RemoteCertificateValidationCallback =
                (sender, cert, chain, errors) => true
        }
    });

builder.Services.AddSingleton<ActivityLogService>();

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

            PooledConnectionLifetime = TimeSpan.FromMinutes(10),
            PooledConnectionIdleTimeout = TimeSpan.FromMinutes(2),
            MaxConnectionsPerServer = 50,

            ConnectTimeout = TimeSpan.FromSeconds(15)
        };

        handler.ConnectCallback = async (ctx, ct) =>
        {
            string hostName = ctx.DnsEndPoint.Host;
            int port = ctx.DnsEndPoint.Port;

            var swDns = System.Diagnostics.Stopwatch.StartNew();

            System.Net.IPAddress[] addresses =
                await System.Net.Dns.GetHostAddressesAsync(hostName, ct);

            swDns.Stop();
            long dnsMs = swDns.ElapsedMilliseconds;

            var ordered = addresses
                .OrderBy(a =>
                    a.AddressFamily
                        == System.Net.Sockets.AddressFamily.InterNetwork
                            ? 0
                            : 1)
                .ToArray();

            var swConn = System.Diagnostics.Stopwatch.StartNew();

            Exception? connectError = null;
            System.Net.IPAddress? usedAddress = null;
            System.Net.Sockets.Socket? connectedSocket = null;

            foreach (var addr in ordered)
            {
                var socket = new System.Net.Sockets.Socket(
                    System.Net.Sockets.SocketType.Stream,
                    System.Net.Sockets.ProtocolType.Tcp)
                {
                    NoDelay = true
                };

                try
                {
                    using var attemptCts =
                        CancellationTokenSource.CreateLinkedTokenSource(ct);
                    attemptCts.CancelAfter(TimeSpan.FromSeconds(10));

                    await socket.ConnectAsync(addr, port, attemptCts.Token);
                    usedAddress = addr;
                    connectedSocket = socket;
                    break;
                }
                catch (Exception exAddr)
                {
                    socket.Dispose();

                    if (ct.IsCancellationRequested)
                    {
                        throw;
                    }

                    connectError = exAddr;
                    connLogger.LogWarning(
                        "[CONNECT] {Host}:{Port} addr={Addr} " +
                        "FAILED after {Ms}ms: {Err}",
                        hostName, port, addr,
                        swConn.ElapsedMilliseconds,
                        exAddr.Message);
                }
            }

            if (connectedSocket == null)
            {
                throw connectError
                    ?? new System.Net.Sockets.SocketException();
            }

            swConn.Stop();

            connLogger.LogInformation(
                "[CONNECT] {Host}:{Port} OPENED NEW connection " +
                "dns={DnsMs}ms connect={ConnectMs}ms " +
                "addrCount={Count} usedAddr={Used}",
                hostName, port, dnsMs,
                swConn.ElapsedMilliseconds,
                ordered.Length, usedAddress);

            try
            {
                return new System.Net.Sockets.NetworkStream(
                    connectedSocket, ownsSocket: true);
            }
            catch
            {
                connectedSocket.Dispose();
                throw;
            }
        };

        if (!isCheckCert)
        {
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

#region ตัด script hot-reload / Browser Link

app.Use(async (context, next) =>
{
    string path = context.Request.Path.Value ?? string.Empty;

    bool isDevInjectEndpoint =
        path.Contains("_vs/browserLink", StringComparison.OrdinalIgnoreCase)
        || path.Contains("aspnetcore-browser-refresh", StringComparison.OrdinalIgnoreCase)
        || path.Contains("browserLink", StringComparison.OrdinalIgnoreCase);

    if (isDevInjectEndpoint)
    {
        context.Response.StatusCode = StatusCodes.Status204NoContent;
        return;
    }

    await next();
});

app.Use(async (context, next) =>
{
    var originalBody = context.Response.Body;

    using var buffer = new MemoryStream();
    context.Response.Body = buffer;

    try
    {
        await next();

        buffer.Seek(0, SeekOrigin.Begin);

        var contentType = context.Response.ContentType ?? string.Empty;

        if (contentType.Contains("text/html", StringComparison.OrdinalIgnoreCase))
        {
            using var reader = new StreamReader(
                buffer,
                System.Text.Encoding.UTF8,
                detectEncodingFromByteOrderMarks: true,
                leaveOpen: true);

            string html = await reader.ReadToEndAsync();

            string cleaned = System.Text.RegularExpressions.Regex.Replace(
                html,
                @"<script[^>]*aspnetcore-browser-refresh[^>]*>.*?</script>",
                string.Empty,
                System.Text.RegularExpressions.RegexOptions.Singleline
                | System.Text.RegularExpressions.RegexOptions.IgnoreCase);

            cleaned = System.Text.RegularExpressions.Regex.Replace(
                cleaned,
                @"<script[^>]*browserLink[^>]*>.*?</script>",
                string.Empty,
                System.Text.RegularExpressions.RegexOptions.Singleline
                | System.Text.RegularExpressions.RegexOptions.IgnoreCase);

            cleaned = System.Text.RegularExpressions.Regex.Replace(
                cleaned,
                @"<script[^>]*/_framework/aspnetcore-browser-refresh\.js[^>]*>.*?</script>",
                string.Empty,
                System.Text.RegularExpressions.RegexOptions.Singleline
                | System.Text.RegularExpressions.RegexOptions.IgnoreCase);

            var bytes = System.Text.Encoding.UTF8.GetBytes(cleaned);

            context.Response.Body = originalBody;
            context.Response.ContentLength = bytes.Length;
            await context.Response.Body.WriteAsync(bytes);
        }
        else
        {
            buffer.Seek(0, SeekOrigin.Begin);
            context.Response.Body = originalBody;
            await buffer.CopyToAsync(originalBody);
        }
    }
    finally
    {
        context.Response.Body = originalBody;
    }
});

#endregion

app.Use(async (context, next) =>
{
    var forwardedPrefix =
        context.Request.Headers["X-Forwarded-Prefix"].ToString();

    var effectivePrefix =
        !string.IsNullOrEmpty(forwardedPrefix)
            ? forwardedPrefix
            : pathBase;

    if (!string.IsNullOrEmpty(effectivePrefix))
    {
        effectivePrefix = "/" + effectivePrefix.Trim('/');
        context.Request.PathBase = effectivePrefix;

        if (context.Request.Path.StartsWithSegments(
                effectivePrefix, out var remainingPath))
        {
            context.Request.Path = remainingPath;
        }
    }

    await next();
});

app.MapGet("/api/config", () =>
{
    return new
    {
        ETL_URL = Environment.GetEnvironmentVariable("ETL_URL")
    };
});

app.MapGet("/api/system/status", async (
    CRMService crmService,
    IHttpContextAccessor httpAccessor,
    IHttpClientFactory httpClientFactory) =>
{
    var context = httpAccessor.HttpContext;

    var currentRoleName = context?.Session.GetString("roleName") ?? "";
    var currentRoleId = context?.Session.GetString("roleId") ?? "";
    var userCode = context?.Session.GetString("personalId") ?? "";

    bool isAdmin = currentRoleName.Contains("Admin", StringComparison.OrdinalIgnoreCase)
                   || string.Equals(currentRoleId, "RCRM001", StringComparison.OrdinalIgnoreCase)
                   || new[] { "100664", "690001", "100657" }.Contains(userCode);

    if (!isAdmin)
    {
        return Results.Forbid();
    }

    var env = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production";
    var version = Environment.GetEnvironmentVariable("appVersion") ?? "3.0.1";
    var hostName = Environment.MachineName;
    string serverIp = "";

    try
    {
        var ips = await Dns.GetHostAddressesAsync(Dns.GetHostName());
        serverIp = ips.FirstOrDefault(a => a.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)?.ToString() ?? "";
    }
    catch { }

    var logUrl = Environment.GetEnvironmentVariable("LOG_URL") ?? "";
    var logAuth = Environment.GetEnvironmentVariable("LOG_Auth") ?? "";
    string logStatus = "Disconnected";
    string logMessage = "";

    if (!string.IsNullOrWhiteSpace(logAuth))
    {
        try
        {
            var uri = new Uri(logAuth);
            using var tcp = new System.Net.Sockets.TcpClient();
            var connectTask = tcp.ConnectAsync(uri.Host, uri.Port);
            if (await Task.WhenAny(connectTask, Task.Delay(1500)) == connectTask && tcp.Connected)
            {
                logStatus = "Connected";
            }
            else
            {
                logStatus = "Disconnected";
                logMessage = "Connect timeout (1.5s)";
            }
        }
        catch (Exception exLog)
        {
            logStatus = "Disconnected";
            logMessage = exLog.Message;
        }
    }

    string backendRaw = await crmService.GetBackendSystemStatus();
    JsonNode? backendNode = null;
    try
    {
        backendNode = JsonNode.Parse(backendRaw);
    }
    catch { }

    var dbStatus = backendNode?["database"]?["status"]?.ToString() ?? "Unknown";
    var dbHost = backendNode?["database"]?["host"]?.ToString() ?? "172.16.20.52";
    var dbPort = backendNode?["database"]?["port"]?.ToString() ?? "1433";
    var dbName = backendNode?["database"]?["database"]?.ToString() ?? "CRM_ForGroupP3";
    var dbLatency = backendNode?["database"]?["latencyMs"]?.ToString() ?? "0";
    var dbError = backendNode?["database"]?["error"]?.ToString();
    var apiStatus = backendNode?["status"]?.ToString() ?? "DOWN";

    return Results.Ok(new
    {
        application = new
        {
            version = version,
            environment = env,
            pathBase = context?.Request.PathBase.Value ?? "/crmweb"
        },
        server = new
        {
            hostname = hostName,
            ip = serverIp,
            os = System.Runtime.InteropServices.RuntimeInformation.OSDescription
        },
        api = new
        {
            status = apiStatus,
            domain = Environment.GetEnvironmentVariable("ApiSettings__APIDomain") ?? ""
        },
        database = new
        {
            status = dbStatus,
            host = dbHost,
            port = dbPort,
            database = dbName,
            latencyMs = dbLatency,
            error = dbError
        },
        logService = new
        {
            status = logStatus,
            url = logUrl,
            authUrl = logAuth,
            message = logMessage
        }
    });
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

// รองรับ attribute routing เช่น SsoController ([Route("sso")] POST /sso/login)
app.MapControllers();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Login}/{action=Index}/{id?}");

app.Run();