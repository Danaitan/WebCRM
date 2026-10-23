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

        // token สำหรับ log ถูกจัดการภายใน service เอง (cache ในหน่วยความจำ)
        // เพื่อให้ login flow ไม่ต้องขอ token และไม่ต้องรอ log ไม่ว่ากรณีใด
        private static string _cachedLogToken = string.Empty;
        private static DateTimeOffset _logTokenExpiresAt = DateTimeOffset.MinValue;
        private static readonly SemaphoreSlim _tokenLock = new(1, 1);

        public ActivityLogService(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        private async Task<string> GetLogTokenAsync(CancellationToken cancellationToken)
        {
            if (!string.IsNullOrWhiteSpace(_cachedLogToken)
                && DateTimeOffset.UtcNow < _logTokenExpiresAt)
            {
                Console.WriteLine(
                    $"[LogAuth] using cached token (expires at {_logTokenExpiresAt:o} UTC)");
                return _cachedLogToken;
            }

            var authUrl = Environment.GetEnvironmentVariable("LOG_Auth");
            Console.WriteLine($"[LogAuth] LOG_Auth = '{authUrl}'");
            if (string.IsNullOrWhiteSpace(authUrl))
            {
                Console.WriteLine(
                    "[LogAuth] LOG_Auth is not configured; sending logs without token.");
                return string.Empty;
            }

            Console.WriteLine("[LogAuth] waiting for token lock...");
            if (!await _tokenLock.WaitAsync(TimeSpan.FromSeconds(30), cancellationToken))
            {
                Console.WriteLine(
                    "[LogAuth] could not acquire token lock within 30s; using existing token "
                    + $"(empty={string.IsNullOrWhiteSpace(_cachedLogToken)}).");
                return _cachedLogToken;
            }

            try
            {
                if (!string.IsNullOrWhiteSpace(_cachedLogToken)
                    && DateTimeOffset.UtcNow < _logTokenExpiresAt)
                {
                    Console.WriteLine(
                        "[LogAuth] token refreshed by another thread; using cached token.");
                    return _cachedLogToken;
                }

                var clientId = Environment.GetEnvironmentVariable("LOG_client_id") ?? "";
                var clientSecret = Environment.GetEnvironmentVariable("LOG_client_secret") ?? "";

                Console.WriteLine(
                    $"[LogAuth] client_id = '{clientId}' "
                    + $"(client_id empty={string.IsNullOrWhiteSpace(clientId)}, "
                    + $"client_secret empty={string.IsNullOrWhiteSpace(clientSecret)})");

                var body = JsonSerializer.Serialize(new
                {
                    client_id = clientId,
                    client_secret = clientSecret
                });

                var authClient = _httpClientFactory.CreateClient();
                authClient.Timeout = Timeout.InfiniteTimeSpan;

                using var authContent = new StringContent(
                    body, Encoding.UTF8, "application/json");

                using var authCts =
                    CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                authCts.CancelAfter(TimeSpan.FromSeconds(30));

                Console.WriteLine($"[LogAuth] POST {authUrl} (timeout 30s)...");
                var sw = System.Diagnostics.Stopwatch.StartNew();

                using var authResponse =
                    await authClient.PostAsync(authUrl, authContent, authCts.Token);

                sw.Stop();
                Console.WriteLine(
                    $"[LogAuth] response HTTP {(int)authResponse.StatusCode} "
                    + $"({authResponse.StatusCode}) in {sw.ElapsedMilliseconds}ms");

                if (!authResponse.IsSuccessStatusCode)
                {
                    var errBody = await authResponse.Content.ReadAsStringAsync(authCts.Token);
                    Console.WriteLine($"[LogAuth] non-success body: {errBody}");
                    Console.WriteLine("[LogAuth] sending logs without token.");
                    return _cachedLogToken;
                }

                var authJson = await authResponse.Content.ReadAsStringAsync(authCts.Token);
                Console.WriteLine($"[LogAuth] success body: {authJson}");

                using var doc = JsonDocument.Parse(authJson);

                if (doc.RootElement.TryGetProperty("access_token", out var tokenProp))
                {
                    var token = tokenProp.GetString() ?? string.Empty;
                    if (!string.IsNullOrWhiteSpace(token))
                    {
                        _cachedLogToken = token;
                        _logTokenExpiresAt =
                            ReadJwtExpiry(token)?.AddSeconds(-30)
                            ?? DateTimeOffset.UtcNow.AddMinutes(5);

                        Console.WriteLine(
                            $"[LogAuth] token acquired (len={token.Length}, "
                            + $"cache expires at {_logTokenExpiresAt:o} UTC)");
                    }
                    else
                    {
                        Console.WriteLine("[LogAuth] access_token present but empty.");
                    }
                }
                else
                {
                    Console.WriteLine("[LogAuth] response has no 'access_token' field.");
                }

                return _cachedLogToken;
            }
            catch (OperationCanceledException)
            {
                Console.WriteLine(
                    "[LogAuth] canceled/timed out; sending logs without token.");
                return _cachedLogToken;
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"[LogAuth] FAILED: {ex.GetType().Name}: {ex.Message}; "
                    + "sending logs without token.");
                if (ex.InnerException != null)
                {
                    Console.WriteLine(
                        $"[LogAuth] inner: {ex.InnerException.GetType().Name}: "
                        + ex.InnerException.Message);
                }
                return _cachedLogToken;
            }
            finally
            {
                _tokenLock.Release();
                Console.WriteLine("[LogAuth] token lock released.");
            }
        }

        // ถอดค่า exp (วันหมดอายุ) จาก payload ของ JWT โดยไม่ต้อง verify ลายเซ็น
        // คืน null หาก token ไม่ใช่ JWT มาตรฐาน หรือไม่มี claim exp
        private static DateTimeOffset? ReadJwtExpiry(string token)
        {
            try
            {
                var parts = token.Split('.');
                if (parts.Length < 2)
                {
                    return null;
                }

                var payload = parts[1]
                    .Replace('-', '+')
                    .Replace('_', '/');

                switch (payload.Length % 4)
                {
                    case 2: payload += "=="; break;
                    case 3: payload += "="; break;
                }

                var bytes = Convert.FromBase64String(payload);
                using var doc = JsonDocument.Parse(bytes);

                if (doc.RootElement.TryGetProperty("exp", out var expProp)
                    && expProp.TryGetInt64(out var expUnix))
                {
                    return DateTimeOffset.FromUnixTimeSeconds(expUnix);
                }

                return null;
            }
            catch
            {
                return null;
            }
        }
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

                var eventTimestamp = nowThai.DateTime.ToString(
                    "yyyy-MM-ddTHH:mm:ss.fffffff",
                    System.Globalization.CultureInfo.InvariantCulture);
                Console.WriteLine(
                    $"[ActivityLogger] timestamp (Thai, no offset) = {eventTimestamp}");
                var envelope = new
                {
                    source_service = "WebCRM",
                    sent_at = eventTimestamp,
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

                Console.WriteLine($"[ActivityLogger] LOG_URL = '{logUrl}'");
                Console.WriteLine($"[ActivityLogger] payload = {json}");

                var client = _httpClientFactory.CreateClient(HttpClientName);

                using var content = new StringContent(
                    json,
                    Encoding.UTF8,
                    "application/json");

                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));

                var token = httpContext?.Items["LogToken"] as string;
                string tokenSource = "HttpContext.Items";

                if (string.IsNullOrWhiteSpace(token))
                {
                    token = httpContext?.Request.Cookies["LogToken"] ?? "";
                    tokenSource = "Cookie";
                }

                if (string.IsNullOrWhiteSpace(token))
                {
                    token = await GetLogTokenAsync(cts.Token);
                    tokenSource = "GetLogTokenAsync";
                }

                Console.WriteLine(
                    $"[ActivityLogger] token source = {tokenSource}, "
                    + $"token empty = {string.IsNullOrWhiteSpace(token)}");

                using var requestMessage =
                    new HttpRequestMessage(HttpMethod.Post, logUrl)
                    {
                        Content = content
                    };

                if (!string.IsNullOrWhiteSpace(token))
                {
                    requestMessage.Headers.Authorization =
                        new AuthenticationHeaderValue("Bearer", token);
                    Console.WriteLine(
                        "[ActivityLogger] Authorization header attached.");
                }
                else
                {
                    Console.WriteLine(
                        "[ActivityLogger] WARNING: LogToken is empty. Sending without Authorization header.");
                }

                Console.WriteLine("[ActivityLogger] POST log (timeout 30s)...");
                var sw = System.Diagnostics.Stopwatch.StartNew();

                using var response = await client.SendAsync(requestMessage, cts.Token);

                sw.Stop();

                var responseBody =
                    await response.Content.ReadAsStringAsync(cts.Token);

                if (!response.IsSuccessStatusCode)
                {
                    Console.WriteLine(
                        $"[ActivityLogger] FAILED HTTP {(int)response.StatusCode} "
                        + $"({response.ReasonPhrase}) in {sw.ElapsedMilliseconds}ms");
                    Console.WriteLine(
                        $"[ActivityLogger] error body: {responseBody}");
                }
                else
                {
                    Console.WriteLine(
                        $"[ActivityLogger] log sent OK. HTTP {(int)response.StatusCode} "
                        + $"in {sw.ElapsedMilliseconds}ms");
                    Console.WriteLine(
                        $"[ActivityLogger] response body: {responseBody}");
                }
            }
            catch (OperationCanceledException)
            {
                Console.WriteLine(
                    "[ActivityLogger] log POST canceled/timed out after 30s; skipping.");
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"[ActivityLogger] Exception: {ex.GetType().Name}: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine(
                        $"[ActivityLogger] inner: {ex.InnerException.GetType().Name}: "
                        + ex.InnerException.Message);
                }
                Console.WriteLine(
                    $"[ActivityLogger] StackTrace: {ex.StackTrace}");
            }
        }
    }
}
