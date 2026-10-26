using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Http;

namespace webCRM.Services
{
    public static class ActivityLogger
    {
        // map ของแต่ละ API endpoint: ชื่อ action ภาษาไทย + ชนิดของ event
        // Source = User   -> API ที่เกิดจากการกดใช้งานของผู้ใช้โดยตรง
        // Source = System -> API ที่ระบบดึงข้อมูลอัตโนมัติเบื้องหลัง (เช่น polling แจ้งเตือน)
        public static readonly Dictionary<string, ActionInfo> ActionMap =
            new(StringComparer.OrdinalIgnoreCase)
            {
                // --- Login / Authentication ---
                { "getProfileByPersonalCode", new("เข้าสู่ระบบ", EventSource.User) },
                { "getPage",                  new("ดึงข้อมูลหน้าMenu", EventSource.System) },

                // --- Campaign (แคมเปญ) ---
                { "getProductsPhase3",            new("ดึงรายการแคมเปญ", EventSource.User) },
                { "getProductFilterByGuid",       new("ดึงตัวกรองแคมเปญ", EventSource.System) },
                { "getProductBatchByProductCode", new("ดึงข้อมูล Batch แคมเปญ", EventSource.User) },
                { "getFilterDropdown",            new("ดึงตัวเลือกตัวกรอง", EventSource.System) },
                { "getProductStatus",             new("ดึงสถานะแคมเปญ", EventSource.System) },
                { "getCheckProductNo",            new("ตรวจสอบเลขแคมเปญ", EventSource.System) },
                { "postNewProduct",               new("สร้างแคมเปญใหม่", EventSource.User) },
                { "putProductsPhase3",            new("แก้ไขแคมเปญ", EventSource.User) },
                { "putProductRemove",             new("ลบแคมเปญ", EventSource.User) },
                { "postNewProductFilter",         new("บันทึกตัวกรองแคมเปญ", EventSource.User) },

                // --- Prospect ---
                { "getProspect_phase3",  new("ดึงรายการ Prospect", EventSource.User) },

                // --- Master Data ---
                // { "getMasterObjective",  new("ดึง Master Objective", EventSource.System) },
                // { "getMasterFilter",     new("ดึง Master Filter", EventSource.System) },
                // { "getMasterDropdown",   new("ดึง Master Dropdown", EventSource.System) },
                // { "getBranchListForCRM", new("ดึงรายการสาขา", EventSource.System) },

                // --- File ---
                { "postFile",   new("อัปโหลดไฟล์", EventSource.User) },
                // { "getFile",    new("ดึงไฟล์", EventSource.User) },
                { "updateFile", new("อัปเดตไฟล์", EventSource.User) },

                // --- Customer ---
                { "customerLists", new("ดึงรายการลูกค้า", EventSource.User) },
                // { "contactLists",  new("ดึงรายการสัญญา", EventSource.User) },
                { "contactInfo",   new("ดึงข้อมูลสัญญา", EventSource.User) },
                // { "receiveInfo",   new("ดึงข้อมูลการรับชำระ", EventSource.User) },
                // { "claimInfo",     new("ดึงข้อมูลการเคลม", EventSource.User) },

                // --- Notification ---
                { "getNotification", new("ดึงการแจ้งเตือน", EventSource.System) },

                // --- PDPA ---
                { "getpdpa",      new("ดึงข้อมูล PDPA", EventSource.System) },
                { "getCheckPDPA", new("ตรวจสอบ PDPA", EventSource.System) },

                // --- Dashboard ---
                { "callDashboard",     new("ดึง Dashboard การโทร", EventSource.User) },
                { "customerDashboard", new("ดึง Dashboard สัญญาลูกค้า", EventSource.User) },

                // --- master ---
                { "master",              new("ดึง master อีเมล", EventSource.System) },
                { "getpersonalwithRole", new("ดึงข้อมูล Role ของพนักงาน", EventSource.User) },
                { "getFunc",             new("ดึงข้อมูล Function ของพนักงาน", EventSource.User) },
                { "getCRMRoles",         new("ดึงข้อมูล Roles ทั้งหมด", EventSource.System) },
                { "getPageSidebar",      new("ดึงหน้าเมนูทั้งหมด", EventSource.System) },
                { "getStaffList",        new("ดึงรายชื่อพนักงานทั้งหมด", EventSource.System) },
                { "postCRMPersonalRole", new("อัพเดท Role พนักงาน", EventSource.User) },
            };

        // หา entry ใน ActionMap ที่ตรงกับ segment ใด segment หนึ่งใน path
        private static ActionInfo? MatchActionInfo(string? endpoint)
        {
            if (string.IsNullOrWhiteSpace(endpoint))
            {
                return null;
            }

            string path = endpoint.Split('?')[0].TrimEnd('/');
            var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);

            foreach (var segment in segments)
            {
                if (ActionMap.TryGetValue(segment, out var info))
                {
                    return info;
                }
            }

            return null;
        }

        public static string ResolveActionName(string? endpoint, string? fallback = null)
        {
            var info = MatchActionInfo(endpoint);
            if (info != null)
            {
                return info.Name;
            }

            if (string.IsNullOrWhiteSpace(endpoint))
            {
                return fallback ?? string.Empty;
            }

            string path = endpoint.Split('?')[0].TrimEnd('/');
            var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
            string lastSegment = segments.LastOrDefault() ?? path;

            return fallback ?? lastSegment;
        }

        // ระบุว่า endpoint นี้เป็น event จากผู้ใช้ หรือการดึงข้อมูลอัตโนมัติของระบบ
        // ถ้าไม่พบใน ActionMap จะถือเป็น User เป็นค่า default
        public static EventSource ResolveEventSource(string? endpoint)
        {
            return MatchActionInfo(endpoint)?.Source ?? EventSource.User;
        }

        private static readonly List<ErrorCode> ErrorCatalog = new()
        {
            // --- SYS-xxxx : map http status -> error code + log level ---
            new ErrorCode { error_code = "SYS-1000", http_status_code = "400", log_level = "WARN"  },
            new ErrorCode { error_code = "SYS-1001", http_status_code = "400", log_level = "WARN"  },
            new ErrorCode { error_code = "SYS-1002", http_status_code = "400", log_level = "WARN"  },
            new ErrorCode { error_code = "SYS-4001", http_status_code = "401", log_level = "WARN"  },
            new ErrorCode { error_code = "SYS-4002", http_status_code = "401", log_level = "WARN"  },
            new ErrorCode { error_code = "SYS-4003", http_status_code = "401", log_level = "WARN"  },
            new ErrorCode { error_code = "SYS-4004", http_status_code = "403", log_level = "WARN"  },
            new ErrorCode { error_code = "SYS-4005", http_status_code = "404", log_level = "WARN"  },
            new ErrorCode { error_code = "SYS-4006", http_status_code = "409", log_level = "WARN"  },
            new ErrorCode { error_code = "SYS-4007", http_status_code = "429", log_level = "WARN"  },
            new ErrorCode { error_code = "SYS-5000", http_status_code = "500", log_level = "ERROR" },
            new ErrorCode { error_code = "SYS-5001", http_status_code = "500", log_level = "FATAL" },
            new ErrorCode { error_code = "SYS-5002", http_status_code = "502", log_level = "ERROR" },
            new ErrorCode { error_code = "SYS-5003", http_status_code = "503", log_level = "ERROR" },
            new ErrorCode { error_code = "SYS-5004", http_status_code = "504", log_level = "ERROR" },
            new ErrorCode { error_code = "SYS-2000", http_status_code = "200", log_level = "INFO"  },
            new ErrorCode { error_code = "SYS-2001", http_status_code = "201", log_level = "INFO"  }
        };

        private const string TraceIdSessionKey = "activityTraceId";

        internal static string GetOrCreateSessionTraceId(HttpContext httpContext)
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

        internal static ErrorCode? ResolveErrorCode(string? code)
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
    }


    // ชนิดของ event: User = ผู้ใช้กดใช้งาน, System = ระบบดึงข้อมูลอัตโนมัติ (-> actor.type)
    public enum EventSource
    {
        User,
        System
    }

    // ข้อมูลของแต่ละ API ใน ActionMap: ชื่อ action + ชนิดของ event
    public sealed record ActionInfo(string Name, EventSource Source);

    public class ErrorCode
    {
        public string? error_code { get; set; }
        public string? http_status_code { get; set; }
        public string? log_level { get; set; }
    }
}
