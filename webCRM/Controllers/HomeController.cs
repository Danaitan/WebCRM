
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Linq;
using webCRM.Models;
using Microsoft.AspNetCore.WebUtilities;    

namespace webCRM.Controllers
{
    public class HomeController(
        IConfiguration configuration) : Controller
    {

        string? bearerToken = Environment.GetEnvironmentVariable("ApiSettings__BearerToken") ?? configuration["ApiSettings:BearerToken"];
        string? domain = Environment.GetEnvironmentVariable("ApiSettings__APIDomain") ?? configuration["ApiSettings:APIDomain"];

        public async Task<IActionResult> Index([FromQuery] string? user = null)
        {
            if (!string.IsNullOrWhiteSpace(user))
            {
                return RedirectToAction("Index", "Login", new { user });
            }

            var profileWelcome = HttpContext.Session.GetString("profile_welcome");
            if (!string.IsNullOrEmpty(profileWelcome))
            {
                ViewData["profile_welcome"] = profileWelcome;
            }
            else
            {
                return RedirectToAction("Index", "Login");
            }

            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }

        public async Task<MasterData> GetMaster()
        {

            try
            {
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using (var client = new HttpClient(handler))
                {
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
                    string userId = HttpContext.Session.GetString("personalId") ?? "";
                    var response = await client.GetAsync($"{domain}/crm/api/v1/master");
                    response.EnsureSuccessStatusCode();
                    string data = await response.Content.ReadAsStringAsync();

                    if (response.IsSuccessStatusCode)
                    {
                        var apiResponse = System.Text.Json.JsonSerializer.Deserialize<MasterData>(data, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                        var result = apiResponse;

                        return result ?? new MasterData();
                    }

                }

            }
            catch (System.Exception ex)
            {
                ViewBag.ErrorMessage = "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;
                return new MasterData();
            }

            return new MasterData();

        }

        [HttpGet]
        public async Task<IActionResult> GetCustommerDashboard(string company, string branch, string cusType, string gender, string contactStatus)
        {
            try
            {
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using (var client = new HttpClient(handler))
                {
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

                    var queryParams = new Dictionary<string, string?>();
                    if (!string.IsNullOrEmpty(company))
                        queryParams["company"] = company;
                    if (!string.IsNullOrEmpty(branch))
                        queryParams["branch"] = branch;
                    if (!string.IsNullOrEmpty(cusType))
                        queryParams["cusType"] = cusType;
                    if (!string.IsNullOrEmpty(gender))
                        queryParams["gender"] = gender;
                    if (!string.IsNullOrEmpty(contactStatus))
                        queryParams["contactStatus"] = contactStatus;

                    var url = QueryHelpers.AddQueryString(
                        $"{domain}/crm/api/v1/p3/customerDashboard", queryParams);

                    var response = await client.GetAsync(url);

                    string data = await response.Content.ReadAsStringAsync();
                    if (!response.IsSuccessStatusCode)
                    {
                        return Content(string.IsNullOrEmpty(data) ? $"{{\"status\": false, \"message\": \"API return error {(int)response.StatusCode}: {response.ReasonPhrase}\"}}" : data, "application/json");
                    }
                    return Content(data, "application/json");
                }
            }
            catch (System.Exception ex)
            {
                ViewBag.ErrorMessage = "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;
                string errJson = JsonSerializer.Serialize(new { status = false, message = "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message });
                return Content(errJson, "application/json");
            }
        }


        [HttpGet]
        public async Task<IActionResult> GetCustommerDashboardDropdown(string company)
        {
            try
            {
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using (var client = new HttpClient(handler))
                {
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

                    var queryParams = new Dictionary<string, string?>();
                    if (!string.IsNullOrEmpty(company))
                        queryParams["company"] = company;

                    var url = QueryHelpers.AddQueryString(
                        $"{domain}/crm/api/v1/p3/customerDashboardDropdown", queryParams);

                    var response = await client.GetAsync(url);

                    string data = await response.Content.ReadAsStringAsync();
                    if (!response.IsSuccessStatusCode)
                    {
                        return Content(string.IsNullOrEmpty(data) ? $"{{\"status\": false, \"message\": \"API return error {(int)response.StatusCode}: {response.ReasonPhrase}\"}}" : data, "application/json");
                    }
                    return Content(data, "application/json");
                }
            }
            catch (System.Exception ex)
            {
                ViewBag.ErrorMessage = "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;
                string errJson = JsonSerializer.Serialize(new { status = false, message = "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message });
                return Content(errJson, "application/json");
            }
        }

        [HttpPost]
        public async Task<IActionResult> PostLogs([FromBody] JsonElement body)
        {
            try
            {
                var url = "https://172.16.17.78:30011/api/v1/logs";
                string json;

                // If caller already sent a full envelope, forward as-is
                if (body.ValueKind == JsonValueKind.Object && body.TryGetProperty("source_service", out _))
                {
                    json = JsonSerializer.Serialize(body);
                }
                else
                {
                    // Build standard envelope from incoming data and context
                    string traceId = Activity.Current?.Id ?? Request.Headers["traceparent"].FirstOrDefault() ?? Guid.NewGuid().ToString();
                    string clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? Request.Headers["X-Forwarded-For"].FirstOrDefault() ?? "";
                    string browser = Request.Headers["User-Agent"].FirstOrDefault() ?? "";
                    string personnelCode = HttpContext.Session.GetString("personalId") ?? (body.TryGetProperty("personnel_code", out var pc) && pc.ValueKind == JsonValueKind.String ? pc.GetString()! : "");
                    string action = body.TryGetProperty("action", out var pa) && pa.ValueKind == JsonValueKind.String ? pa.GetString()! : (body.TryGetProperty("event", out var pe) && pe.ValueKind == JsonValueKind.Object && pe.TryGetProperty("action", out var ea) ? ea.GetString()! : "");
                    string category = body.TryGetProperty("category", out var pcg) && pcg.ValueKind == JsonValueKind.String ? pcg.GetString()! : "USER";
                    string logLevel = body.TryGetProperty("log_level", out var ll) && ll.ValueKind == JsonValueKind.String ? ll.GetString()! : "INFO";
                    int code = body.TryGetProperty("code", out var cd) && cd.ValueKind == JsonValueKind.Number && cd.TryGetInt32(out var ci) ? ci : 0;
                    string status = body.TryGetProperty("status", out var st) ? st.ToString() : (code >= 200 && code < 300 ? "success" : "error");
                    string targetId = body.TryGetProperty("target_id", out var tid) && tid.ValueKind == JsonValueKind.String ? tid.GetString()! : "";
                    string targetType = body.TryGetProperty("target_type", out var ttp) && ttp.ValueKind == JsonValueKind.String ? ttp.GetString()! : "";
                    string message = body.TryGetProperty("message", out var msg) && msg.ValueKind == JsonValueKind.String ? msg.GetString()! : (body.TryGetProperty("details", out var det) && det.ValueKind == JsonValueKind.Object && det.TryGetProperty("message", out var dmsg) ? dmsg.GetString()! : "");
                    string module = body.TryGetProperty("module", out var mod) && mod.ValueKind == JsonValueKind.String ? mod.GetString()! : "";
                    string environment = body.TryGetProperty("environment", out var env) && env.ValueKind == JsonValueKind.String ? env.GetString()! : "production";
                    string appVersion = body.TryGetProperty("app_version", out var av) && av.ValueKind == JsonValueKind.String ? av.GetString()! : "3.0.0";

                    var envelope = new
                    {
                        source_service = "WebCRM",
                        sent_at = DateTime.UtcNow.ToString("o"),
                        context = new { environment = environment, app_version = appVersion },
                        events = new[]
                        {
                            new
                            {
                                timestamp = DateTime.UtcNow.ToString("o"),
                                trace_id = traceId,
                                log_level = logLevel,
                                @event = new { category = category, action = action, status = status, code = code },
                                actor = new { id = personnelCode, type = "USER", client_ip = clientIp, session_id = HttpContext.Session.Id },
                                target = new { id = targetId, type = targetType },
                                details = new { message = message, browser = browser, module = module }
                            }
                        }
                    };

                    json = JsonSerializer.Serialize(envelope, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
                }

                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => true
                };

                using (var client = new HttpClient(handler))
                {
                    var token = Request.Headers["Authorization"].FirstOrDefault();
                    client.DefaultRequestHeaders.Remove("Authorization");
                    if (!string.IsNullOrEmpty(token))
                    {
                        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", token);
                    }

                    using var content = new StringContent(json, Encoding.UTF8, "application/json");
                    var response = await client.PostAsync(url, content);
                    var responseBody = await response.Content.ReadAsStringAsync();

                    var payload = string.IsNullOrEmpty(responseBody)
                        ? JsonSerializer.Deserialize<JsonElement>(JsonSerializer.Serialize(new { status = response.IsSuccessStatusCode ? "accepted" : "error" }))
                        : JsonSerializer.Deserialize<JsonElement>(responseBody);

                    return StatusCode((int)response.StatusCode, payload);
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { status = "error", message = ex.Message });
            }
        }

    }
}

