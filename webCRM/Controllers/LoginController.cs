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
        public async Task<IActionResult> Index()
        {
            return View("login");
        }

        public async Task<IActionResult> GetProfile(string userName, string passWord)
        {
            try
            {
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using var client = new HttpClient(handler);
                
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", configuration["ApiSettings:BearerToken"]);
                var domain = configuration["ApiSettings:APILogin"];

                var request = new
                {
                    username = userName,
                    password = passWord
                };

                var content = new StringContent(
                    JsonSerializer.Serialize(request),
                    Encoding.UTF8,
                    "application/json");

                var response = await client.PostAsync(
                    $"{domain}/login",
                    content);

                response.EnsureSuccessStatusCode();

                string json = await response.Content.ReadAsStringAsync();

                LoginResponse? apiResponse = null;
                try
                {
                    apiResponse = JsonSerializer.Deserialize<LoginResponse>(
                        json,
                        _jsonSerializerOptions);
                }
                catch (JsonException)
                {
                    return Unauthorized(new { message = "Login failed" });
                }

                ProfileData result = apiResponse?.data?.FirstOrDefault() ?? new ProfileData();

                if (string.IsNullOrEmpty(result.adAccount))
                {
                    return Unauthorized(new { message = "Login failed" });
                }

                string company = "";
                if (result.eMail != null && result.eMail.Contains("microleasingplc")) company = "MICRO";
                if (result.eMail != null && result.eMail.Contains("microinsurebroker")) company = "MIB";
                if (result.eMail != null && result.eMail.Contains("mfin")) company = "MFIN";

                HttpContext.Session.SetString("profile_welcome", $"{company} [{result.adAccount}] ({result.personalNameTh} {result.personalLastNameTh})");
                HttpContext.Session.SetString("fullNameEn", $"{result.personalNameEn} {result.personalLastNameEn}");
                HttpContext.Session.SetString("personalId", result.adAccount);
                HttpContext.Session.SetString("email", result.eMail ?? "");

                return Ok(result);
            }
            catch (Exception)
            {
                return Unauthorized(new { message = "Login failed" });
            }
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }

    }
}
