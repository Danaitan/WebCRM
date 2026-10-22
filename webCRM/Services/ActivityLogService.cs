using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace webCRM.Services
{

    public sealed class ActivityLogService
    {
        public const string HttpClientName = "ActivityLog";

        private readonly IHttpClientFactory _httpClientFactory;

        public ActivityLogService(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        // คืนเวลาปัจจุบันเป็นเวลาไทย (+07:00) เสมอ ไม่ขึ้นกับ timezone ของเครื่อง/คอนเทนเนอร์
        private static DateTimeOffset GetThaiNow()
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
                thaiZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Bangkok");
            }

            return TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, thaiZone);
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
            try
            {
                environment ??= Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
                if (!IsLogOn)
                {
                    Console.WriteLine(
                        "[ActivityLogger] isLogOn is not \"true\" (value: "
                        + (Environment.GetEnvironmentVariable("isLogOn") ?? "")
                        + "). Skipping log.");
                    return;
                }

                var logUrl = LogUrl;

                if (string.IsNullOrWhiteSpace(logUrl))
                {
                    Console.WriteLine(
                        "[ActivityLogger] WARNING: LOG_URL is not configured. Skipping log.");
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
                    catch
                    {

                    }
                }

                if (string.IsNullOrEmpty(personnelCode)
                    && !string.IsNullOrEmpty(actorIdOverride))
                {
                    personnelCode = actorIdOverride;
                }

                var resolved = ActivityLogger.ResolveErrorCode(code);

                string eventCode = resolved?.error_code ?? code ?? string.Empty;

                string eventLogLevel = resolved?.log_level ?? "INFO";

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
                    Console.WriteLine(
                        "[ActivityLogger] WARNING: LogToken cookie is empty. Sending without Authorization header.");
                }

                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3));

                using var response = await client.SendAsync(requestMessage, cts.Token);

                //if (!response.IsSuccessStatusCode)
                //{
                //    var errorContent =
                //        await response.Content.ReadAsStringAsync();

                //    Console.WriteLine(
                //        $"[ActivityLogger] HTTP {(int)response.StatusCode} {response.ReasonPhrase}");

                //    Console.WriteLine(
                //        $"[ActivityLogger] Error Response Body: {errorContent}");
                //}
                //else
                //{
                //    Console.WriteLine(
                //        $"[ActivityLogger] Log sent successfully. HTTP {(int)response.StatusCode}");
                //}
            }
            catch (OperationCanceledException)
            {

                Console.WriteLine(
                    "[ActivityLogger] log POST canceled/timed out after 3s; skipping.");
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"[ActivityLogger] Exception: {ex.GetType().Name}: {ex.Message}");

                Console.WriteLine(
                    $"[ActivityLogger] StackTrace: {ex.StackTrace}");
            }
        }
    }
}
