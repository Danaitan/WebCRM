using System;
using System.Diagnostics;
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

                _ = LogCallAsync(
                    method,
                    endpoint,
                    response,
                    error,
                    stopwatch.ElapsedMilliseconds);
            }
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

            string status = success ? "SUCCESS" : "FAILURE";

            string code =
                response != null
                    ? ((int)response.StatusCode).ToString()
                    : "-";

            string message =
                error != null
                    ? $"{method} {endpoint} failed after {elapsedMs} ms: {error.GetType().Name}: {error.Message}"
                    : $"{method} {endpoint} responded {code} in {elapsedMs} ms";

            string module = endpoint.Split('?')[0];

            return ActivityLogger.SendAsync(
                httpContext,
                action: $"{method} {module}",
                category: "service",
                status: status,
                code: code,
                targetType: "CRMApi",
                message: message,
                module: module);
        }
    }
}
