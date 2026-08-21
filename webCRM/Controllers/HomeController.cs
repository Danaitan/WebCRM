
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using webCRM.Models;
using Microsoft.AspNetCore.WebUtilities;

namespace webCRM.Controllers
{
    public class HomeController(
        IConfiguration configuration) : Controller
    {

        string? bearerToken = Environment.GetEnvironmentVariable("ApiSettings__BearerToken") ?? configuration["ApiSettings:BearerToken"];
        string? domain = Environment.GetEnvironmentVariable("ApiSettings__APIDomain") ?? configuration["ApiSettings:APIDomain"];

        public async Task<IActionResult> Index()
        {
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
        public async Task<IActionResult> GetCustommerDashboard(string branch, string cusType, string gender, string contactStatus)
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
        public async Task<List<Branch>> getBranchListForCRM()
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
                    var response = await client.GetAsync($"{domain}/crm/api/v1/p2/getBranchListForCRM");

                    if (response.IsSuccessStatusCode)
                    {
                        string data = await response.Content.ReadAsStringAsync();
                        var apiResponse = JsonSerializer.Deserialize<List<Branch>>(data, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                        return apiResponse ?? new List<Branch>();
                    }
                    else
                    {
                        return new List<Branch>();
                    }
                }
            }
            catch (System.Exception)
            {
                return new List<Branch>();
            }
        }

    }
}

