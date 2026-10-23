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
        private readonly ILogger<CrmApiLoggingHandler> _logger;
        private readonly ActivityLogService _activityLog;

        public CrmApiLoggingHandler(
            IHttpContextAccessor httpContextAccessor,
            ILogger<CrmApiLoggingHandler> logger,
            ActivityLogService activityLog)
        {
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
            _activityLog = activityLog;
        }

        private const long SlowApiThresholdMs = 1000;

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

                long elapsedMs = stopwatch.ElapsedMilliseconds;

                string codeText =
                    response != null
                        ? ((int)response.StatusCode).ToString()
                        : (error != null ? "ERR" : "-");

                if (elapsedMs >= SlowApiThresholdMs)
                {
                    _logger.LogWarning(
                        "[CRMAPI] {Method} {Endpoint} -> {Code} in {ElapsedMs}ms (SLOW)",
                        method, endpoint, codeText, elapsedMs);
                }
                else
                {
                    _logger.LogInformation(
                        "[CRMAPI] {Method} {Endpoint} -> {Code} in {ElapsedMs}ms",
                        method, endpoint, codeText, elapsedMs);
                }

                if (!ShouldSkipLogging(method, endpoint))
                {
                    // Fire-and-forget: การ log ต้องไม่ทำให้ request หลักพังไม่ว่ากรณีใด
                    // ครอบ try/catch รอบการ "เริ่ม" task ด้วย เผื่อ exception เกิดก่อนเข้า try ภายใน SendAsync
                    // และผูก continuation กันไม่ให้เกิด unobserved task exception
                    try
                    {
                        _ = LogCallAsync(
                                method,
                                endpoint,
                                response,
                                error,
                                elapsedMs)
                            .ContinueWith(
                                t =>
                                {
                                    if (t.Exception != null)
                                    {
                                        _logger.LogWarning(
                                            t.Exception.Flatten(),
                                            "[CRMAPI] activity log failed for {Method} {Endpoint}",
                                            method, endpoint);
                                    }
                                },
                                TaskContinuationOptions.OnlyOnFaulted);
                    }
                    catch (Exception logEx)
                    {
                        _logger.LogWarning(
                            logEx,
                            "[CRMAPI] activity log threw synchronously for {Method} {Endpoint}",
                            method, endpoint);
                    }
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
                    "/contactLists",
                    "/receiveInfo",
                    "/claimInfo",
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

            string action = ActivityLogger.ResolveActionName(
                module,
                fallback: $"{method} {module}");

            string? actorOverride = ExtractPersonalCodeFromPath(module);

            return _activityLog.SendAsync(
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

            int slash = tail.IndexOf('/');
            return slash >= 0 ? tail[..slash] : tail;
        }
    }
}
