using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace webCRM.Services
{

    public sealed class CrmApiLoggingHandler : DelegatingHandler
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CrmApiLoggingHandler(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            var stopwatch = Stopwatch.StartNew();

            var method = request.Method.Method;

            var endpoint =
                request.RequestUri?.PathAndQuery
                ?? request.RequestUri?.ToString()
                ?? string.Empty;

            HttpResponseMessage? response = null;
            Exception? error = null;

            try
            {
                response = await base.SendAsync(request, cancellationToken);
                return response;
            }
            catch (Exception ex)
            {
                error = ex;
                throw;
            }
            finally
            {
                stopwatch.Stop();

                if (!ShouldSkipLogging(method, endpoint))
                {
                    _ = LogCallAsync(
                        method,
                        endpoint,
                        response,
                        error,
                        stopwatch.ElapsedMilliseconds);
                }
            }
        }

        // รายการ endpoint ที่ "not allow" คือไม่ต้องการให้ส่ง LOG
        private static readonly Dictionary<string, HashSet<string>> NotAllowedEndpoints =
            new(StringComparer.OrdinalIgnoreCase)
            {
                ["GET"] = new(StringComparer.OrdinalIgnoreCase)
                {
                    "/p3/customerDashboardDropdown",
                    "/p3/getNotification",
                },

                ["POST"] = new(StringComparer.OrdinalIgnoreCase)
                {
                    "/logs/api/v1/auth/token",
                },
            };

        private static bool IsNotAllowedEndpoint(string method, string path)
        {
            return NotAllowedEndpoints.TryGetValue(method, out var paths) &&
                paths.Any(path.EndsWith);
        }

        private static bool ShouldSkipLogging(string method, string endpoint)
        {
            string path = endpoint.Split('?')[0];
            return IsNotAllowedEndpoint(method, path);
        }

        private Task LogCallAsync(
            string method,
            string endpoint,
            HttpResponseMessage? response,
            Exception? error,
            long elapsedMs)
        {
            var httpContext = _httpContextAccessor.HttpContext;

            bool success =
                error == null &&
                response != null &&
                response.IsSuccessStatusCode;

            string status = success ? "SUCCESS" : "FAILED";

            string code =
                response != null
                    ? ((int)response.StatusCode).ToString()
                    : "-";

            string message =
                error != null
                    ? $"{method} {endpoint} failed after {elapsedMs} ms: {error.GetType().Name}: {error.Message}"
                    : $"{method} {endpoint} responded {code} in {elapsedMs} ms";

            string module = endpoint.Split('?')[0];

            // ใช้ ActionMap แปลงชื่อ action ให้อ่านง่าย
            // ถ้าไม่มีใน map จะ fallback เป็น "{METHOD} {path}" เหมือนเดิม
            string action = ActivityLogger.ResolveActionName(
                module,
                fallback: $"{method} {module}");

            // ตอน login session ยังไม่มี personalId
            // ดึง personalCode จาก URL path เพื่อส่งเป็น actorIdOverride
            string? actorOverride = ExtractPersonalCodeFromPath(module);

            return ActivityLogger.SendAsync(
                httpContext,
                action: action,
                category: "service",
                status: status,
                code: code,
                targetType: "CRMApi",
                message: message,
                module: module,
                actorIdOverride: actorOverride);
        }

        // ดึง personalCode จาก path เช่น
        // /p2/getProfileByPersonalCode/100664 → "100664"
        // คืน null ถ้า path ไม่ตรงรูปแบบ เพื่อให้ SendAsync ใช้ session ตามปกติ
        private static string? ExtractPersonalCodeFromPath(string path)
        {
            const string marker = "getProfileByPersonalCode/";

            int idx = path.IndexOf(
                marker,
                StringComparison.OrdinalIgnoreCase);

            if (idx < 0)
            {
                return null;
            }

            string tail = path[(idx + marker.Length)..].TrimEnd('/');

            // เอาเฉพาะ segment แรก (กัน path ต่อท้าย)
            int slash = tail.IndexOf('/');
            return slash >= 0 ? tail[..slash] : tail;
        }
    }
}
