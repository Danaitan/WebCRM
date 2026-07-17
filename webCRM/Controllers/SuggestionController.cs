using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using webCRM.Models;
using System.Diagnostics;
using System.Text;
using System.Text.Json;

namespace webCRM.Controllers
{
    public class SuggestionsController(IConfiguration configuration) : Controller
    {
        string? bearerToken = Environment.GetEnvironmentVariable("ApiSettings__BearerToken") ?? configuration["ApiSettings:BearerToken"];
        string? domain = Environment.GetEnvironmentVariable("ApiSettings__APIDomain") ?? configuration["ApiSettings:APIDomain"];

        private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString,
            Converters = { new NumberToStringConverter() }
        };

        public async Task<IActionResult> Index()
        {
            var personalId = HttpContext.Session.GetString("personalId") ?? "";
            var suggestions = await GetSuggestionList(personalId);
            return View("suggestions", suggestions);
        }

        public async Task<string> AddRequestSuggestions(RequestSuggestionsModel request)
        {
            try
            {
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using var client = new HttpClient(handler);

                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
                var response = await client.PostAsJsonAsync($"{domain}/crm/api/v1/suggestionDetail", request);
                if (response.IsSuccessStatusCode)
                {
                    return "ยืนยันการบันทึกข้อมูล";
                }

                return "";

            }
            catch (System.Exception ex)
            {
                ViewBag.ErrorMessage = "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;
                return "";
            }
        }

        public async Task<List<ResponseSuggestion>> GetSuggestionList(string personalId)
        {
            try
            {
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using var client = new HttpClient(handler);

                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
                var response = await client.GetAsync($"{domain}/crm/api/v1/suggestions/0/{personalId}");
                response.EnsureSuccessStatusCode();
                string data = await response.Content.ReadAsStringAsync();
                if (response.IsSuccessStatusCode)
                {
                    var apiResponse = System.Text.Json.JsonSerializer.Deserialize<List<ResponseSuggestion>>(data, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    return apiResponse ?? new List<ResponseSuggestion>();
                }

            }
            catch (System.Exception ex)
            {
                ViewBag.ErrorMessage = "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;
                return new List<ResponseSuggestion>();
            }
            return new List<ResponseSuggestion>();
        }

        public async Task<IActionResult> UpdateSuggestion(string guid, string reply, string updBy)
        {
            try
            {
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using var client = new HttpClient(handler);

                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

                var request = new
                {
                    guid = guid,
                    reply = reply,
                    updBy = updBy
                };

                var content = new StringContent(
                    JsonSerializer.Serialize(request),
                    Encoding.UTF8,
                    "application/json");

                var response = await client.PostAsync(
                    $"{domain}/crm/api/v1/suggestionDetail",
                    content);

                if (!response.IsSuccessStatusCode)
                {
                    return Ok(new { status = "error", message = $"API responded with status code: {response.StatusCode}" });
                }

                string json = await response.Content.ReadAsStringAsync();
                try
                {
                    if (!string.IsNullOrWhiteSpace(json))
                    {
                        using var doc = JsonDocument.Parse(json);
                        return Content(json, "application/json");
                    }
                }
                catch (JsonException)
                {
                    // Fallback if not valid JSON
                }

                return Ok(new { status = "success" });
            }
            catch (Exception ex)
            {
                return Ok(new { status = "error", message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> PostSuggestion([FromBody] RequestPostSuggestion request)
        {
            try
            {
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using var client = new HttpClient(handler);

                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

                request.Guid = Guid.NewGuid().ToString();

                if (string.IsNullOrEmpty(request.Status))
                {
                    request.Status = "Pending";
                }

                if (string.IsNullOrEmpty(request.Company))
                {
                    var email = HttpContext.Session.GetString("email") ?? "";
                    string company = "";
                    if (email.Contains("microleasingplc")) company = "MICRO";
                    else if (email.Contains("microinsurebroker")) company = "MIB";
                    else if (email.Contains("mfin")) company = "MFIN";
                    request.Company = company;
                }

                if (string.IsNullOrEmpty(request.UpdBy))
                {
                    request.UpdBy = HttpContext.Session.GetString("email") ?? "";
                }

                request.UpdDate = DateOnly.FromDateTime(DateTime.Today);

                var content = new StringContent(
                    JsonSerializer.Serialize(request),
                    Encoding.UTF8,
                    "application/json");

                var response = await client.PostAsync(
                    $"{domain}/crm/api/v1/suggestion",
                    content);

                if (!response.IsSuccessStatusCode)
                {
                    return Ok(new { status = "error", message = $"API responded with status code: {response.StatusCode}" });
                }

                string json = await response.Content.ReadAsStringAsync();
                try
                {
                    if (!string.IsNullOrWhiteSpace(json))
                    {
                        using var doc = JsonDocument.Parse(json);
                        return Content(json, "application/json");
                    }
                }
                catch (JsonException)
                {
                    // Fallback if not valid JSON
                }

                return Ok(new { status = "success" });
            }
            catch (Exception ex)
            {
                return Ok(new { status = "error", message = ex.Message });
            }
        }

    }
}
