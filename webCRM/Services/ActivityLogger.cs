using System;
using System.Diagnostics;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace webCRM.Services
{
    public static class ActivityLogger
    {
        private static string? LogUrl =>
            Environment.GetEnvironmentVariable("LOG_URL");

        private static bool IsLogOn =>
            string.Equals(
                Environment.GetEnvironmentVariable("isLogOn"),
                "true",
                StringComparison.OrdinalIgnoreCase);

        private static readonly List<ErrorCode> ErrorCatalog = new()
        {
            new ErrorCode { error_code = "SYS-1000", http_status_code = "400", category = "VALIDATION", default_message_en = "Invalid request payload format", default_message_th = "รูปแบบข้อมูลที่ส่งมาไม่ถูกต้อง", log_level = "WARN" },
            new ErrorCode { error_code = "SYS-1001", http_status_code = "400", category = "VALIDATION", default_message_en = "Required fields are missing", default_message_th = "กรอกข้อมูลไม่ครบถ้วนตามที่กำหนด", log_level = "WARN" },
            new ErrorCode { error_code = "SYS-1002", http_status_code = "400", category = "VALIDATION", default_message_en = "Invalid data format or value", default_message_th = "ข้อมูลที่ระบุมีรูปแบบหรือค่าไม่ถูกต้อง", log_level = "WARN" },
            new ErrorCode { error_code = "SYS-4001", http_status_code = "401", category = "AUTH", default_message_en = "Unauthorized access or missing token", default_message_th = "กรุณายืนยันตัวตนก่อนเข้าใช้งาน", log_level = "WARN" },
            new ErrorCode { error_code = "SYS-4002", http_status_code = "401", category = "AUTH", default_message_en = "Token has expired", default_message_th = "เซสชันหมดอายุ กรุณาล็อกอินใหม่อีกครั้ง", log_level = "WARN" },
            new ErrorCode { error_code = "SYS-4003", http_status_code = "401", category = "AUTH", default_message_en = "Invalid access token or signature", default_message_th = "โทเคนไม่ถูกต้องหรือถูกแก้ไข", log_level = "WARN" },
            new ErrorCode { error_code = "SYS-4004", http_status_code = "403", category = "AUTH", default_message_en = "Permission denied for this resource", default_message_th = "คุณไม่มีสิทธิ์เข้าถึงหรือทำรายการนี้", log_level = "WARN" },
            new ErrorCode { error_code = "SYS-4005", http_status_code = "404", category = "RESOURCE", default_message_en = "Requested resource not found", default_message_th = "ไม่พบข้อมูลหรือทรัพยากรที่ร้องขอ", log_level = "WARN" },
            new ErrorCode { error_code = "SYS-4006", http_status_code = "409", category = "RESOURCE", default_message_en = "Resource conflict or duplicate data", default_message_th = "พบข้อมูลซ้ำในระบบ ไม่สามารถดำเนินการได้", log_level = "WARN" },
            new ErrorCode { error_code = "SYS-4007", http_status_code = "429", category = "RATE_LIMIT", default_message_en = "Too many requests. Please try again later", default_message_th = "มีการเรียกใช้งานถี่เกินไป กรุณารอสักครู่", log_level = "WARN" },
            new ErrorCode { error_code = "SYS-5000", http_status_code = "500", category = "SYSTEM", default_message_en = "Internal server error occurred", default_message_th = "เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง", log_level = "ERROR" },
            new ErrorCode { error_code = "SYS-5001", http_status_code = "500", category = "DATABASE", default_message_en = "Database connection error or query failed", default_message_th = "ไม่สามารถเชื่อมต่อหรือประมวลผลฐานข้อมูลได้", log_level = "FATAL" },
            new ErrorCode { error_code = "SYS-5002", http_status_code = "502", category = "GATEWAY", default_message_en = "Bad gateway or upstream service error", default_message_th = "ระบบย่อยตอบกลับไม่ถูกต้อง", log_level = "ERROR" },
            new ErrorCode { error_code = "SYS-5003", http_status_code = "503", category = "SYSTEM", default_message_en = "Service temporarily unavailable", default_message_th = "ระบบปิดปรับปรุงชั่วคราว กรุณาลองใหม่ภายหลัง", log_level = "ERROR" },
            new ErrorCode { error_code = "SYS-5004", http_status_code = "504", category = "TIMEOUT", default_message_en = "Service response timeout", default_message_th = "การเชื่อมต่อหมดเวลา (Timeout)", log_level = "ERROR" }
        };

        private static ErrorCode? ResolveErrorCode(string? code)
        {
            if (string.IsNullOrWhiteSpace(code))
            {
                return null;
            }

            var key = code.Trim();

            var byCode = ErrorCatalog.FirstOrDefault(e =>
                string.Equals(e.error_code, key, StringComparison.OrdinalIgnoreCase));

            if (byCode != null)
            {
                return byCode;
            }

            return ErrorCatalog.FirstOrDefault(e =>
                string.Equals(e.http_status_code, key, StringComparison.OrdinalIgnoreCase));
        }

        public static async Task SendAsync(
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
            string? appVersion = null
            )
        {
            try
            {
                environment ??= Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
                appVersion ??= Environment.GetEnvironmentVariable("appVersion") ?? "3.0.0";

                if (!IsLogOn)
                {
                    Debug.WriteLine(
                        "[ActivityLogger] isLogOn is not \"true\". Skipping log.");
                    return;
                }

                var logUrl = LogUrl;

                if (string.IsNullOrWhiteSpace(logUrl))
                {
                    Debug.WriteLine(
                        "[ActivityLogger] WARNING: LOG_URL is not configured. Skipping log.");
                    return;
                }

                string traceId = Guid.NewGuid().ToString();

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

                        sessionId = httpContext.Session.Id;
                    }
                    catch
                    {
                        // Session may not be available on every request path.
                    }
                }

                // แปลง code ที่รับเข้ามาให้เป็น error_code จาก catalog
                // ถ้าหาเจอจะส่ง error_code (เช่น SYS-1000) และใช้ log_level จาก catalog
                var resolved = ResolveErrorCode(code);

                string eventCode = resolved?.error_code ?? code ?? string.Empty;

                string eventLogLevel = resolved?.log_level ?? "INFO";

                var thaiTime = TimeZoneInfo.ConvertTimeBySystemTimeZoneId(
                    DateTime.UtcNow,
                    "SE Asia Standard Time"
                );
                var envelope = new
                {
                    source_service = "WebCRM",
                    sent_at = DateTime.UtcNow.ToString("o"),
                    context = new
                    {
                        environment = environment ?? string.Empty,
                        app_version = appVersion ?? string.Empty
                    },
                    events = new[]
                    {
                        new
                        {

                            timestamp = thaiTime,
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
                                type = "USER",
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
                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                    });

                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback =
                        (message, cert, chain, errors) => true
                };

                using var client = new HttpClient(handler);

                using var content = new StringContent(
                    json,
                    Encoding.UTF8,
                    "application/json");

                var token = Environment.GetEnvironmentVariable("LOG_Token");

                if (!string.IsNullOrWhiteSpace(token))
                {
                    client.DefaultRequestHeaders.Authorization =
                        new AuthenticationHeaderValue("Bearer", token);
                }
                else
                {
                    Debug.WriteLine(
                        "[ActivityLogger] WARNING: LOG_Token is not configured.");
                }

                Debug.WriteLine(
                    $"[ActivityLogger] Sending POST {logUrl}");

                var response = await client.PostAsync(
                    logUrl,
                    content);

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent =
                        await response.Content.ReadAsStringAsync();

                    Debug.WriteLine(
                        $"[ActivityLogger] HTTP {(int)response.StatusCode} {response.ReasonPhrase}");

                    Debug.WriteLine(
                        $"[ActivityLogger] Error Response Body: {errorContent}");
                }
                else
                {
                    Debug.WriteLine(
                        $"[ActivityLogger] Log sent successfully. HTTP {(int)response.StatusCode}");
                }

                response.Dispose();
            }
            catch (Exception ex)
            {
                // Logging failure must NOT break the main application.
                Console.WriteLine(
                    $"[ActivityLogger] Exception: {ex.GetType().Name}: {ex.Message}");

                Console.WriteLine(
                    $"[ActivityLogger] StackTrace: {ex.StackTrace}");
            }
        }
    }

public class ErrorCode
{
    public string? error_code { get; set; }
    public string? http_status_code { get; set; }
    public string? category { get; set; }
    public string? default_message_en { get; set; }
    public string? default_message_th { get; set; }
    public string? log_level { get; set; }
}

}
