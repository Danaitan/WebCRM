using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace webCRM.Services
{

    public sealed class ActivityLogService
    {
        public const string HttpClientName = "ActivityLog";

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<ActivityLogService> _logger;
        private readonly IConfiguration _configuration;

        public ActivityLogService(
            IHttpClientFactory httpClientFactory,
            ILogger<ActivityLogService> logger,
            IConfiguration configuration)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _configuration = configuration;
        }

        // คืนเวลาปัจจุบันเป็นเวลาไทย (+07:00) เสมอ ไม่ขึ้นกับ timezone ของเครื่อง/คอนเทนเนอร์
        private DateTimeOffset GetThaiNow()
        {
            TimeZoneInfo thaiZone;
            try
            {
                // Windows
                thaiZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
            }
            catch (TimeZoneNotFoundException)
            {
                // Linux / Docker (IANA)
                _logger.LogDebug(
                    "[ActivityLogger] 'SE Asia Standard Time' not found, falling back to 'Asia/Bangkok'.");

                thaiZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Bangkok");
            }

            return TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, thaiZone);
        }

        // อ่านค่า appVersion จาก Properties/launchSettings.json โดยตรง
        // หมายเหตุ: ไฟล์นี้เป็นไฟล์สำหรับ dev เท่านั้น และปกติจะไม่ถูก publish ไปด้วยตอน deploy จริง
        // ถ้าหาไฟล์/ค่าไม่เจอจะคืน null เพื่อให้ caller fallback ไปแหล่งอื่นต่อได้
        private string? ReadAppVersionFromLaunchSettings()
        {
            try
            {
                var path = System.IO.Path.Combine(
                    AppContext.BaseDirectory, "Properties", "launchSettings.json");

                // เผื่อ working directory เป็น content root (ตอน dotnet run) ก็ลองอีกตำแหน่ง
                if (!System.IO.File.Exists(path))
                {
                    var altPath = System.IO.Path.Combine(
                        Directory.GetCurrentDirectory(), "Properties", "launchSettings.json");

                    if (System.IO.File.Exists(altPath))
                    {
                        path = altPath;
                    }
                }

                if (!System.IO.File.Exists(path))
                {
                    _logger.LogDebug(
                        "[ActivityLogger] launchSettings.json not found (looked near {Path}).", path);

                    return null;
                }

                using var doc = JsonDocument.Parse(System.IO.File.ReadAllText(path));

                if (!doc.RootElement.TryGetProperty("profiles", out var profiles)
                    || profiles.ValueKind != JsonValueKind.Object)
                {
                    return null;
                }

                // ถ้ารู้ว่ากำลังรัน profile ไหน (DOTNET_LAUNCH_PROFILE) ให้ลองตัวนั้นก่อน
                var activeProfile = Environment.GetEnvironmentVariable("DOTNET_LAUNCH_PROFILE");

                if (!string.IsNullOrWhiteSpace(activeProfile)
                    && profiles.TryGetProperty(activeProfile, out var activeEl)
                    && TryGetAppVersionFromProfile(activeEl, out var activeVersion))
                {
                    return activeVersion;
                }

                // ไม่งั้นไล่หา profile แรกที่มี appVersion ใน environmentVariables
                foreach (var profile in profiles.EnumerateObject())
                {
                    if (TryGetAppVersionFromProfile(profile.Value, out var version))
                    {
                        return version;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(
                    ex, "[ActivityLogger] Failed to read appVersion from launchSettings.json.");
            }

            return null;
        }

        private static bool TryGetAppVersionFromProfile(JsonElement profile, out string? version)
        {
            version = null;

            if (profile.ValueKind == JsonValueKind.Object
                && profile.TryGetProperty("environmentVariables", out var envVars)
                && envVars.ValueKind == JsonValueKind.Object
                && envVars.TryGetProperty("appVersion", out var appVersionEl)
                && appVersionEl.ValueKind == JsonValueKind.String)
            {
                var value = appVersionEl.GetString();

                if (!string.IsNullOrWhiteSpace(value))
                {
                    version = value;

                    return true;
                }
            }

            return false;
        }

        private static string? LogUrl =>
            Environment.GetEnvironmentVariable("LOG_URL");

        private static bool IsLogOn =>
            string.Equals(
                Environment.GetEnvironmentVariable("isLogOn"),
                "true",
                StringComparison.OrdinalIgnoreCase);

        public async Task SendAsync(
            HttpContext? httpContext,
            string action,
            string category = "user",
            string status = "SUCCESS",
            string code = "-",
            string targetId = "",
            string targetType = "",
            string message = "",
            string module = "",
            string? environment = null,
            string? appVersion = null,
            string? actorIdOverride = null
            )
        {
            _logger.LogDebug(
                "[ActivityLogger] SendAsync started. Action={Action}, Category={Category}, Status={Status}, Code={Code}, TargetId={TargetId}, TargetType={TargetType}, Module={Module}",
                action,
                category,
                status,
                code,
                targetId,
                targetType,
                module);

            try
            {
                environment ??= Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");

                // ถ้า caller ไม่ได้ส่ง appVersion มา ให้ resolve ตามลำดับ:
                //   1) Properties/launchSettings.json (บังคับดึงจากไฟล์นี้ก่อนตามที่ต้องการ)
                //   2) env var "appVersion" / "APP_VERSION" (Docker/host ตั้งไว้)
                //   3) IConfiguration["appVersion"] (จาก appsettings.json) — fallback สุดท้ายตอน deploy จริง
                //      เพราะ launchSettings.json มักไม่ถูก publish ไปด้วย
                if (string.IsNullOrWhiteSpace(appVersion))
                {
                    appVersion =
                        ReadAppVersionFromLaunchSettings()
                        ?? Environment.GetEnvironmentVariable("appVersion")
                        ?? Environment.GetEnvironmentVariable("APP_VERSION")
                        ?? _configuration["appVersion"];
                }

                if (!IsLogOn)
                {
                    _logger.LogInformation(
                        "[ActivityLogger] isLogOn is not \"true\" (value: {IsLogOn}). Skipping log for action {Action}.",
                        Environment.GetEnvironmentVariable("isLogOn") ?? string.Empty,
                        action);

                    return;
                }

                var logUrl = LogUrl;

                if (string.IsNullOrWhiteSpace(logUrl))
                {
                    _logger.LogWarning(
                        "[ActivityLogger] LOG_URL is not configured. Skipping log for action {Action}.",
                        action);

                    return;
                }

                string traceId = string.Empty;

                string clientIp = string.Empty;
                string browser = string.Empty;
                string personnelCode = string.Empty;
                string sessionId = string.Empty;

                if (httpContext != null)
                {
                    clientIp =
                        httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',').FirstOrDefault()?.Trim()
                        ?? httpContext.Request.Headers["X-Real-IP"].FirstOrDefault()
                        ?? httpContext.Connection.RemoteIpAddress?.ToString()
                        ?? string.Empty;

                    browser =
                        httpContext.Request.Headers["User-Agent"].FirstOrDefault()
                        ?? string.Empty;

                    try
                    {
                        personnelCode =
                            httpContext.Session.GetString("personalId")
                            ?? string.Empty;

                        if (string.IsNullOrEmpty(personnelCode)
                            && !string.IsNullOrEmpty(actorIdOverride))
                        {
                            personnelCode = actorIdOverride;
                        }

                        sessionId = httpContext.Session.Id;

                        traceId = ActivityLogger.GetOrCreateSessionTraceId(httpContext);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(
                            ex,
                            "[ActivityLogger] Failed to read session data (personnelCode/sessionId/traceId). Continuing with available values.");
                    }
                }
                else
                {
                    _logger.LogDebug(
                        "[ActivityLogger] httpContext is null. Actor/session/trace fields will be empty for action {Action}.",
                        action);
                }

                if (string.IsNullOrEmpty(personnelCode)
                    && !string.IsNullOrEmpty(actorIdOverride))
                {
                    personnelCode = actorIdOverride;
                }

                var resolved = ActivityLogger.ResolveErrorCode(code);

                string eventCode = resolved?.error_code ?? code ?? string.Empty;

                string eventLogLevel = resolved?.log_level ?? "INFO";

                _logger.LogDebug(
                    "[ActivityLogger] Resolved context. TraceId={TraceId}, PersonnelCode={PersonnelCode}, ClientIp={ClientIp}, EventCode={EventCode}, EventLogLevel={EventLogLevel}, Environment={Environment}, AppVersion={AppVersion}",
                    traceId,
                    personnelCode,
                    clientIp,
                    eventCode,
                    eventLogLevel,
                    environment ?? string.Empty,
                    appVersion ?? string.Empty);

                var nowThai = GetThaiNow();
                var eventTimestamp = nowThai.ToString("o");
                var envelope = new
                {
                    source_service = "WebCRM",
                    sent_at = nowThai.ToString("o"),
                    context = new
                    {
                        environment = environment ?? string.Empty,
                        app_version = appVersion ?? string.Empty
                    },
                    events = new[]
                    {
                        new
                        {

                            timestamp = eventTimestamp,
                            trace_id = traceId,
                            log_level = eventLogLevel,

                            @event = new
                            {
                                category = category ?? string.Empty,
                                action = action ?? string.Empty,
                                status = status ?? string.Empty,
                                code = eventCode
                            },

                            actor = new
                            {
                                id = personnelCode,
                                type = "user",
                                client_ip = clientIp,
                                session_id = sessionId
                            },

                            target = new
                            {
                                id = targetId ?? string.Empty,
                                type = targetType ?? string.Empty
                            },

                            details = new
                            {
                                message = message ?? string.Empty,
                                browser = browser,
                                module = module ?? string.Empty
                            }
                        }
                    }
                };

                var json = JsonSerializer.Serialize(
                    envelope,
                    new JsonSerializerOptions
                    {
                        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
                    });

                // log รายละเอียด envelope ที่จะส่งออกมาแบบ JSON อ่านง่าย (indented) สำหรับดีบัค
                if (_logger.IsEnabled(LogLevel.Debug))
                {
                    var prettyJson = JsonSerializer.Serialize(
                        envelope,
                        new JsonSerializerOptions
                        {
                            WriteIndented = true,
                            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
                        });

                    _logger.LogDebug(
                        "[ActivityLogger] Log_envelope for {LogUrl}:\n{Envelope}",
                        logUrl,
                        prettyJson);
                }

                var client = _httpClientFactory.CreateClient(HttpClientName);

                using var content = new StringContent(
                    json,
                    Encoding.UTF8,
                    "application/json");

                var token = httpContext?.Items["LogToken"] as string;
                // var token = Environment.GetEnvironmentVariable("LOG_Token") ?? "";

                if (string.IsNullOrWhiteSpace(token))
                {
                    token = httpContext?.Request.Cookies["LogToken"] ?? "";
                }

                using var requestMessage =
                    new HttpRequestMessage(HttpMethod.Post, logUrl)
                    {
                        Content = content
                    };

                if (!string.IsNullOrWhiteSpace(token))
                {
                    requestMessage.Headers.Authorization =
                        new AuthenticationHeaderValue("Bearer", token);
                }
                else
                {
                    _logger.LogWarning(
                        "[ActivityLogger] LogToken is empty. Sending request without Authorization header for action {Action}.",
                        action);
                }

                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3));

                var sw = System.Diagnostics.Stopwatch.StartNew();

                _logger.LogDebug(
                    "[ActivityLogger] Sending POST to {LogUrl} for action {Action} (trace {TraceId}).",
                    logUrl,
                    action,
                    traceId);

                using var response = await client.SendAsync(requestMessage, cts.Token);

                sw.Stop();

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent =
                        await response.Content.ReadAsStringAsync();

                    _logger.LogError(
                        "[ActivityLogger] Log POST failed. StatusCode={StatusCode} {ReasonPhrase}, ElapsedMs={ElapsedMs}, Action={Action}, TraceId={TraceId}, ResponseBody={ResponseBody}",
                        (int)response.StatusCode,
                        response.ReasonPhrase,
                        sw.ElapsedMilliseconds,
                        action,
                        traceId,
                        errorContent);
                }
                else
                {
                    _logger.LogInformation(
                        "[ActivityLogger] Log sent successfully. StatusCode={StatusCode}, ElapsedMs={ElapsedMs}, Action={Action}, TraceId={TraceId}.",
                        (int)response.StatusCode,
                        sw.ElapsedMilliseconds,
                        action,
                        traceId);
                }
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning(
                    "[ActivityLogger] Log POST canceled/timed out after 3s; skipping. Action={Action}.",
                    action);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "[ActivityLogger] Unexpected exception while sending log. Action={Action}.",
                    action);
            }
        }
    }
}
