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
using System.Linq;

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
            Converters = { new NumberToStringConverter(), new FlexibleNullableDateTimeConverter(), new FlexibleDateTimeConverter() }
        };

        public async Task<IActionResult> Index()
        {
            var personalId = HttpContext.Session.GetString("personalId") ?? "";
            var suggestions = await GetSuggestionList(personalId);
            return View("suggestions", suggestions);
        }

        [HttpGet]
        public async Task<IActionResult> GetSuggestions(string? status = null, string? header = null, string? search = null)
        {
            var personalId = HttpContext.Session.GetString("personalId") ?? "";
            var suggestions = await GetSuggestionList(personalId, status, header, search);
            return Json(suggestions);
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

        public async Task<List<ResponseSuggestion>> GetSuggestionList(string personalId, string? status = null, string? header = null, string? search = null)
        {
            try
            {
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using var client = new HttpClient(handler);

                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

                var queryParams = new List<string>();
                if (!string.IsNullOrWhiteSpace(status)) queryParams.Add($"status={Uri.EscapeDataString(status.Trim())}");
                if (!string.IsNullOrWhiteSpace(header)) queryParams.Add($"header={Uri.EscapeDataString(header.Trim())}");
                if (!string.IsNullOrWhiteSpace(search)) queryParams.Add($"search={Uri.EscapeDataString(search.Trim())}");

                var queryString = queryParams.Count > 0 ? "?" + string.Join("&", queryParams) : "";
                var pId = string.IsNullOrWhiteSpace(personalId) ? "0" : personalId.Trim();
                var response = await client.GetAsync($"{domain}/crm/api/v1/suggestions/0/{pId}{queryString}");
                response.EnsureSuccessStatusCode();
                string data = await response.Content.ReadAsStringAsync();
                if (response.IsSuccessStatusCode)
                {
                    var apiResponse = System.Text.Json.JsonSerializer.Deserialize<List<ResponseSuggestion>>(data, _jsonSerializerOptions);
                    var list = apiResponse ?? new List<ResponseSuggestion>();

                    if (!string.IsNullOrWhiteSpace(status))
                    {
                        list = list.Where(x => string.Equals(x.StatusTask?.Trim(), status.Trim(), StringComparison.OrdinalIgnoreCase)).ToList();
                    }
                    if (!string.IsNullOrWhiteSpace(header))
                    {
                        list = list.Where(x => string.Equals(x.SuggestionTitle?.Trim(), header.Trim(), StringComparison.OrdinalIgnoreCase) ||
                                               string.Equals(x.DepartCde?.Trim(), header.Trim(), StringComparison.OrdinalIgnoreCase)).ToList();
                    }
                    if (!string.IsNullOrWhiteSpace(search))
                    {
                        var s = search.Trim();
                        list = list.Where(x =>
                            (x.SuggestionTitle != null && x.SuggestionTitle.Contains(s, StringComparison.OrdinalIgnoreCase)) ||
                            (x.NameProvider != null && x.NameProvider.Contains(s, StringComparison.OrdinalIgnoreCase)) ||
                            (x.PersonalName != null && x.PersonalName.Contains(s, StringComparison.OrdinalIgnoreCase)) ||
                            (x.StatusTask != null && x.StatusTask.Contains(s, StringComparison.OrdinalIgnoreCase)) ||
                            (x.Suggestion != null && x.Suggestion.Contains(s, StringComparison.OrdinalIgnoreCase)) ||
                            (x.PhoneProvider != null && x.PhoneProvider.Contains(s, StringComparison.OrdinalIgnoreCase)) ||
                            (x.EmailProvider != null && x.EmailProvider.Contains(s, StringComparison.OrdinalIgnoreCase))
                        ).ToList();
                    }

                    list = list.OrderByDescending(x => {
                        DateTime? dt = (x.CreatedDate.HasValue && x.CreatedDate.Value.Year > 1900) ? x.CreatedDate : null;
                        if (!dt.HasValue && x.DateSugges.HasValue && x.DateSugges.Value.Year > 1900)
                        {
                            dt = x.TimeSugges.HasValue && x.TimeSugges.Value.Year > 1900
                                ? x.DateSugges.Value.Date.Add(x.TimeSugges.Value.TimeOfDay)
                                : x.DateSugges.Value;
                        }
                        if (!dt.HasValue && x.UpDate.HasValue && x.UpDate.Value.Year > 1900)
                        {
                            dt = x.UpDate;
                        }
                        return dt ?? DateTime.MinValue;
                    }).ToList();

                    return list;
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

                await UpdateSuggestionStatus(guid, "Reply");

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

                if (!string.IsNullOrWhiteSpace(request.ccMail))
                {
                    var emails = request.ccMail.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries)
                                               .Select(e => e.Trim())
                                               .Where(e => !string.IsNullOrEmpty(e));
                    request.ccMail = string.Join(" , ", emails);
                }

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

        public async Task<IActionResult> PutSuggestionStatusUpd(string guid)
        {
            try
            {
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using var client = new HttpClient(handler);

                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

                var response = await client.PutAsync($"{domain}/crm/api/v1/suggestionStatusUpd/{guid}", null);

                if (!response.IsSuccessStatusCode)
                {
                    return Ok(new { status = "error", message = $"API responded with status code: {response.StatusCode}" });
                }
                return Ok(new { status = "success" });
            }
            catch (Exception ex)
            {
                return Ok(new { status = "error", message = ex.Message });
            }
        }

        public async Task<IActionResult> UpdateSuggestionStatus(string guid, string? statusTask = null, string? sendTo = null)
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
                    statusTask = statusTask,
                    sendTo = sendTo
                };

                var content = new StringContent(
                    JsonSerializer.Serialize(request),
                    Encoding.UTF8,
                    "application/json");

                var response = await client.PutAsync($"{domain}/crm/api/v1/p3/updateSuggestion", content);

                if (!response.IsSuccessStatusCode)
                {
                    return Ok(new { status = "error", message = $"API responded with status code: {response.StatusCode}" });
                }
                return Ok(new { status = "success" });
            }
            catch (Exception ex)
            {
                return Ok(new { status = "error", message = ex.Message });
            }
        }

        public async Task<IActionResult> GetSuggestionHeader()
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
                    var response = await client.GetAsync($"{domain}/crm/api/v1/p3/getSuggestionHeader");
                    response.EnsureSuccessStatusCode();
                    string data = await response.Content.ReadAsStringAsync();
                    return Content(data, "application/json");
                }
            }
            catch (System.Exception ex)
            {
                return Content("\"เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message + "\"", "application/json");
            }
        }

        public async Task<IActionResult> GetSuggestionStatus()
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
                    var response = await client.GetAsync($"{domain}/crm/api/v1/p3/getSuggestionStatus");
                    response.EnsureSuccessStatusCode();
                    string data = await response.Content.ReadAsStringAsync();
                    return Content(data, "application/json");
                }
            }
            catch (System.Exception ex)
            {
                return Content("\"เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message + "\"", "application/json");
            }
        }

        [HttpPost]
        public async Task<IActionResult> SendEmail([FromBody] SendEmailRequest request)
        {

            try
            {
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using var client = new HttpClient(handler);

                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

                request.ContentType = "HTML";
                request.From = HttpContext.Session.GetString("email") ?? ""; ;

                var content = new StringContent(
                    JsonSerializer.Serialize(request),
                    Encoding.UTF8,
                    "application/json");

                var response = await client.PostAsync(
                    $"{domain}/crm/api/v1/p3/sendEmail",
                    content);

                if (!response.IsSuccessStatusCode)
                {
                    return Ok(new { status = "error", message = $"API responded with status code: {response.StatusCode}" });
                }

                return Ok(new { status = "success" });
            }
            catch (Exception ex)
            {
                return Ok(new { status = "error", message = ex.Message });
            }

        }

        [HttpPost]
        public async Task<IActionResult> PostNotification([FromBody] PostNotiRequest request)
        {

            try
            {
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using var client = new HttpClient(handler);

                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

                request.Sender = HttpContext.Session.GetString("personalId") ?? "";
                request.CreateBy = HttpContext.Session.GetString("personalId") ?? "";

                if (string.IsNullOrWhiteSpace(request.Receiver) && string.IsNullOrWhiteSpace(request.ReceiverEmail))
                {
                    return Ok(new { status = "error", message = "Receiver or ReceiverEmail is required." });
                }

                var content = new StringContent(
                    JsonSerializer.Serialize(request),
                    Encoding.UTF8,
                    "application/json");

                var response = await client.PostAsync(
                    $"{domain}/crm/api/v1/p3/postNotification",
                    content);

                if (!response.IsSuccessStatusCode)
                {
                    return Ok(new { status = "error", message = $"API responded with status code: {response.StatusCode}" });
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
