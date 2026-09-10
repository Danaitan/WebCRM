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
private const string DefaultLogUrl = "https://172.16.17.78:30011/api/v1/logs";

    public static async Task SendAsync(
        HttpContext httpContext,
        string action,
        string category = "user",
        string status = "SUCCESS",
        string code = "-",
        string targetId = "",
        string targetType = "",
        string message = "",
        string module = "",
        string environment = "production",
        string appVersion = "3.0.0")
    {
        try
        {

            var logUrl = DefaultLogUrl;
            string traceId = Guid.NewGuid().ToString();

            string clientIp =
                httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',').FirstOrDefault()?.Trim()
                ?? httpContext.Request.Headers["X-Real-IP"].FirstOrDefault()
                ?? httpContext.Connection.RemoteIpAddress?.ToString()
                ?? string.Empty;

            string browser =
                httpContext.Request.Headers["User-Agent"].FirstOrDefault()
                ?? string.Empty;

            string personnelCode =
                httpContext.Session.GetString("personalId")
                ?? string.Empty;

            string eventCode = code ?? string.Empty;

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
                        timestamp = DateTime.UtcNow.ToString("o"),
                        trace_id = traceId,
                        log_level = "INFO",

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
                            session_id = httpContext.Session.Id
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

            var token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXJ2aWNlIjoibW9iaWxlLWlvcy1hcHAiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3ODkwMzE5ODIsImV4cCI6NDk0MjYzMTk4Mn0.ug4LIemWO4ajA2M8qQSSx8wLTBAzlMhFTNRBR4gHiBA";

            if (!string.IsNullOrWhiteSpace(token))
            {
                client.DefaultRequestHeaders.Authorization =
                    new AuthenticationHeaderValue("Bearer", token);
            }
            else
            {
                Debug.WriteLine(
                    "[ActivityLogger] WARNING: ActivityLogger__Token is not configured.");
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

}
