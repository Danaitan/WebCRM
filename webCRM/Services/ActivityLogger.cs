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
        public static readonly Dictionary<string, string> ActionMap =
            new(StringComparer.OrdinalIgnoreCase)
            {
                // --- Login / Authentication ---
                { "getProfileByPersonalCode", "เข้าสู่ระบบ" },
                { "getPage",                  "ดึงข้อมูลหน้าMenu" },

                // --- Campaign (แคมเปญ) ---
                { "getProductsPhase3",           "ดึงรายการแคมเปญ" },
                { "getProductFilterByGuid",      "ดึงตัวกรองแคมเปญ" },
                { "getProductBatchByProductCode", "ดึงข้อมูล Batch แคมเปญ" },
                { "getFilterDropdown",           "ดึงตัวเลือกตัวกรอง" },
                { "getProductStatus",            "ดึงสถานะแคมเปญ" },
                { "getCheckProductNo",           "ตรวจสอบเลขแคมเปญ" },
                { "postNewProduct",              "สร้างแคมเปญใหม่" },
                { "putProductsPhase3",           "แก้ไขแคมเปญ" },
                { "putProductRemove",            "ลบแคมเปญ" },
                { "postNewProductFilter",        "บันทึกตัวกรองแคมเปญ" },

                // --- Prospect ---
                { "getProspect_phase3",  "ดึงรายการ Prospect" },

                // --- Master Data ---
                { "getMasterObjective",  "ดึง Master Objective" },
                { "getMasterFilter",     "ดึง Master Filter" },
                { "getMasterDropdown",   "ดึง Master Dropdown" },
                { "getBranchListForCRM", "ดึงรายการสาขา" },

                // --- File ---
                { "postFile",   "อัปโหลดไฟล์" },
                { "getFile",    "ดึงไฟล์" },
                { "updateFile", "อัปเดตไฟล์" },

                // --- Customer ---
                { "customerLists", "ดึงรายการลูกค้า" },
                { "contactLists",  "ดึงรายการผู้ติดต่อ" },
                { "contactInfo",   "ดึงข้อมูลผู้ติดต่อ" },
                { "receiveInfo",   "ดึงข้อมูลการรับชำระ" },
                { "claimInfo",     "ดึงข้อมูลการเคลม" },

                // --- Notification ---
                { "getNotification", "ดึงการแจ้งเตือน" },

                // --- PDPA ---
                { "getpdpa",      "ดึงข้อมูล PDPA" },
                { "getCheckPDPA", "ตรวจสอบ PDPA" },

                // --- Dashboard ---
                { "callDashboard", "ดึง Dashboard การโทร" },
                {"customerDashboard","ดึง Dashboard สัญญาลูกค้า"},

                // --- master ---
                {"master","ดึง master อีเมล"},
                {"getpersonalwithRole","ดึงข้อมูล Role ของพนักงาน"},
                {"getFunc","ดึงข้อมูล Function ของพนักงาน"},
                {"getCRMRoles","ดึงข้อมูล Roles ทั้งหมด"},
                {"getPageSidebar","ดึงหน้าเมนูทั้งหมด"},
                {"getStaffList","ดึงรายชื่อพนักงานทั้งหมด"},
                {"postCRMPersonalRole","อัพเดท Role พนักงาน"},
            };

        public static string ResolveActionName(string? endpoint, string? fallback = null)
        {
            if (string.IsNullOrWhiteSpace(endpoint))
            {
                return fallback ?? string.Empty;
            }

            string path = endpoint.Split('?')[0].TrimEnd('/');
            var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
            foreach (var segment in segments)
            {
                if (ActionMap.TryGetValue(segment, out var friendly))
                {
                    return friendly;
                }
            }

            string lastSegment =
                segments.LastOrDefault() ?? path;

            return fallback ?? lastSegment;
        }

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
            new ErrorCode { error_code = "SYS-5004", http_status_code = "504", category = "TIMEOUT", default_message_en = "Service response timeout", default_message_th = "การเชื่อมต่อหมดเวลา (Timeout)", log_level = "ERROR" },
            new ErrorCode { error_code = "SYS-2000", http_status_code = "200", category = "SYSTEM", default_message_en = "OK", default_message_th = "OK", log_level = "INFO" },
            new ErrorCode { error_code = "SYS-2001", http_status_code = "201", category = "SYSTEM", default_message_en = "Created", default_message_th = "สร้างแล้ว", log_level = "INFO" }
        };

        private const string TraceIdSessionKey = "activityTraceId";

        private static string GetOrCreateSessionTraceId(HttpContext httpContext)
        {
            var existing = httpContext.Session.GetString(TraceIdSessionKey);

            if (!string.IsNullOrEmpty(existing))
            {
                return existing;
            }

            var traceId = Guid.NewGuid().ToString();
            httpContext.Session.SetString(TraceIdSessionKey, traceId);
            return traceId;
        }

        public static string ResetSessionTraceId(HttpContext httpContext)
        {
            var traceId = Guid.NewGuid().ToString();
            httpContext.Session.SetString(TraceIdSessionKey, traceId);
            return traceId;
        }

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

                        traceId = GetOrCreateSessionTraceId(httpContext);
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

                var resolved = ResolveErrorCode(code);

                string eventCode = resolved?.error_code ?? code ?? string.Empty;

                string eventLogLevel = resolved?.log_level ?? "INFO";

                var eventTimestamp = DateTime.UtcNow.ToString("o");
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

                // var token = httpContext?.Items["LogToken"] as string;
                var token = Environment.GetEnvironmentVariable("LOG_Token") ?? "";;

                if (string.IsNullOrWhiteSpace(token))
                {
                    token = httpContext?.Request.Cookies["LogToken"] ?? "";
                }

                if (!string.IsNullOrWhiteSpace(token))
                {
                    client.DefaultRequestHeaders.Authorization =
                        new AuthenticationHeaderValue("Bearer", token);
                }
                else
                {
                    Console.WriteLine(
                        "[ActivityLogger] WARNING: LogToken cookie is empty. Sending without Authorization header.");
                }

                // Console.WriteLine(
                //     $"[ActivityLogger] Sending POST {logUrl}");
                // Console.WriteLine(
                //     $"[ActivityLogger] Payload: {json}");

                var response = await client.PostAsync(
                    logUrl,
                    content);

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent =
                        await response.Content.ReadAsStringAsync();

                    Console.WriteLine(
                        $"[ActivityLogger] HTTP {(int)response.StatusCode} {response.ReasonPhrase}");

                    Console.WriteLine(
                        $"[ActivityLogger] Error Response Body: {errorContent}");
                }
                else
                {
                    Console.WriteLine(
                        $"[ActivityLogger] Log sent successfully. HTTP {(int)response.StatusCode}");
                }

                response.Dispose();
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
