using webCRM.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace webCRM.Controllers
{
    public class LoginController(IConfiguration configuration) : Controller
    {
        private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString,
            Converters = { new NumberToStringConverter() }
        };
        public async Task<IActionResult> Index([FromQuery] string? user)
        {
            await GetProfileByPersonalCode(user);
            return RedirectToAction("Index", "Home");
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }

        public async Task<IActionResult> GetProfileByPersonalCode([FromQuery] string? user = null)
        {

            try
            {
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using var client = new HttpClient(handler);

                var bearerToken = Environment.GetEnvironmentVariable("ApiSettings__BearerToken") ?? configuration["ApiSettings:BearerToken"];
                string? domain = Environment.GetEnvironmentVariable("ApiSettings__APIDomain") ?? configuration["ApiSettings:APIDomain"];

                if (string.IsNullOrEmpty(domain))
                {
                    return Unauthorized(new { message = "Login failed: API Domain is not configured. (ApiSettings:APILogin is null)" });
                }

                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
                
                string personalCode = "100664";
                if (!string.IsNullOrWhiteSpace(user))
                {
                    personalCode = DecodeBase64(user);
                }

                string url = $"{domain}/crm/api/v1/p2/getProfileByPersonalCode/{personalCode}";

                var response = await client.GetAsync(url);

                response.EnsureSuccessStatusCode();

                string json = await response.Content.ReadAsStringAsync();

                GetProfileByPersonalCodeResponse? apiResponse = null;
                try
                {
                    using var doc = JsonDocument.Parse(json);
                    var root = doc.RootElement;

                    if (root.ValueKind == JsonValueKind.Array)
                    {
                        var list = JsonSerializer.Deserialize<List<GetProfileByPersonalCodeResponse>>(
                            json,
                            _jsonSerializerOptions);
                        apiResponse = list?.FirstOrDefault();
                    }
                    else if (root.ValueKind == JsonValueKind.Object)
                    {
                        if (root.TryGetProperty("data", out var dataElement))
                        {
                            if (dataElement.ValueKind == JsonValueKind.Array)
                            {
                                var list = JsonSerializer.Deserialize<List<GetProfileByPersonalCodeResponse>>(
                                    dataElement.GetRawText(),
                                    _jsonSerializerOptions);
                                apiResponse = list?.FirstOrDefault();
                            }
                            else if (dataElement.ValueKind == JsonValueKind.Object)
                            {
                                apiResponse = JsonSerializer.Deserialize<GetProfileByPersonalCodeResponse>(
                                    dataElement.GetRawText(),
                                    _jsonSerializerOptions);
                            }
                        }
                        else
                        {
                            apiResponse = JsonSerializer.Deserialize<GetProfileByPersonalCodeResponse>(
                                json,
                                _jsonSerializerOptions);
                        }
                    }
                }
                catch (JsonException)
                {
                    return Unauthorized(new { message = "Login failed: Invalid API Response format" });
                }

                GetProfileByPersonalCodeResponse result = apiResponse ?? new GetProfileByPersonalCodeResponse();

                string company = "";
                if (result.EMail != null && result.EMail.Contains("microleasingplc")) company = "MICRO";
                if (result.EMail != null && result.EMail.Contains("microinsurebroker")) company = "MIB";
                if (result.EMail != null && result.EMail.Contains("mfin")) company = "MFIN";

                HttpContext.Session.SetString("profile_welcome", $"{company} [{result.PersonnelCode}] ({result.PersonnelNameTH} {result.PersonnelLastTH})");
                HttpContext.Session.SetString("fullNameEn", $"{result.PersonnelNameEN} {result.PersonnelLastEN}");
                HttpContext.Session.SetString("personalId", result.PersonnelCode ?? "");
                HttpContext.Session.SetString("email", result.EMail ?? "");
                HttpContext.Session.SetString("company", company);
                HttpContext.Session.SetString("fullNameTh", $"{result.PersonnelNameTH} {result.PersonnelLastTH}");
                HttpContext.Session.SetString("roleId", $"{result.role_id}");
                string branchNo = int.TryParse(result.BranchNo, out int bNo) ? bNo.ToString("00") : (result.BranchNo ?? "");
                HttpContext.Session.SetString("branchName", $"{branchNo}-{result.Branch}");

                var loginLog = new 
                {
                    personalCde = result.PersonnelCode ?? "",
                    action = "เข้าสู่ระบบ"
                };

                var content = new StringContent(
                    JsonSerializer.Serialize(loginLog),
                    Encoding.UTF8,
                    "application/json");

                await client.PostAsync(
                    $"{domain}/crm/api/v1/loginlog",
                    content);

                return Ok(result);
            }
            catch (Exception ex)
            {
                return Unauthorized(new { message = $"Login failed: {ex.Message}" });
            }

        }

        private static string DecodeBase64(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return string.Empty;
            try
            {
                string s = input.Trim().Replace('-', '+').Replace('_', '/');
                switch (s.Length % 4)
                {
                    case 2: s += "=="; break;
                    case 3: s += "="; break;
                }
                byte[] bytes = Convert.FromBase64String(s);
                return Encoding.UTF8.GetString(bytes);
            }
            catch
            {
                return input;
            }
        }

        public async Task<IActionResult> GetPage([FromQuery] string personalCode, [FromQuery] string menuPosition)
        {
            try
            {
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using var client = new HttpClient(handler);

                var bearerToken = Environment.GetEnvironmentVariable("ApiSettings__BearerToken") ?? configuration["ApiSettings:BearerToken"];
                string? domain = Environment.GetEnvironmentVariable("ApiSettings__APIDomain") ?? configuration["ApiSettings:APIDomain"];

                if (string.IsNullOrEmpty(domain))
                {
                    return Unauthorized(new { message = "Login failed: API Domain is not configured. (ApiSettings:APILogin is null)" });
                }

                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
                string url = $"{domain}/crm/api/v1/p3/getPage?personalCode={personalCode}&menuPosition={menuPosition}";

                var response = await client.GetAsync(url);

                response.EnsureSuccessStatusCode();

                string json = await response.Content.ReadAsStringAsync();

                return Content(json, "application/json");
            }
            catch (Exception ex)
            {
                return Unauthorized(new { message = $"Login failed: {ex.Message}" });
            }
        }
    
    }
}
