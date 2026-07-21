using webCRM.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace webCRM.Controllers
{
    public class CampainController(IConfiguration configuration) : Controller
    {
        string? bearerToken = Environment.GetEnvironmentVariable("ApiSettings_BearerToken") ?? configuration["ApiSettings:BearerToken"];
        // string? domain = Environment.GetEnvironmentVariable("ApiSettings_APIDomain") ?? configuration["ApiSettings:APIDomain"];
        string? domain = "https://localhost:7103";
        public async Task<IActionResult> Index()
        {
            return View("campain");
        }

        public async Task<List<ProductGet>> GetCampainList()
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
                    string getCase = "ownerview";
                    string userId = HttpContext.Session.GetString("personalId") ?? "";
                    var response = await client.GetAsync($"{domain}/crm/api/v1/p2/getProducts/{userId}/{getCase}");
                    response.EnsureSuccessStatusCode();
                    string data = await response.Content.ReadAsStringAsync();
                    if (response.IsSuccessStatusCode)
                    {
                        var apiResponse = System.Text.Json.JsonSerializer.Deserialize<List<ProductGet>>(data, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                        var result = apiResponse;

                        return result ?? new List<ProductGet>();
                    }

                }

            }
            catch (System.Exception ex)
            {
                ViewBag.ErrorMessage = "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;
                return new List<ProductGet>();
            }

            return new List<ProductGet>();

        }

        public async Task<string> DeleteCampain(string productId)
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
                    var response = await client.GetAsync($"{domain}/crm/api/v1/p2/putProductRemove/{productId}");
                }

            }
            catch (System.Exception ex)
            {
                ViewBag.ErrorMessage = "เกิดข้อผิดพลาดในการลบข้อมูล: " + ex.Message;
                return "Remove Failed";
            }

            return "Remove Success";

        }

        [HttpPost]
        public async Task<IActionResult> PostCampain([FromBody] PostCampaign request)
        {
            try
            {
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using var client = new HttpClient(handler);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

                var content = new StringContent(
                    JsonSerializer.Serialize(new[] { request }),
                    Encoding.UTF8,
                    "application/json");

                var response = await client.PostAsync(
                    $"{domain}/crm/api/v1/p2/postNewProduct",
                    content);

                if (!response.IsSuccessStatusCode)
                {
                    return Ok(new { status = "error", message = $"API responded with status code: {response.StatusCode}" });
                }

                string json = await response.Content.ReadAsStringAsync();

                return Ok(new { status = "success" });
            }
            catch (System.Exception ex)
            {
                return Ok(new { status = "error", message = ex.Message });
            }

        }

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
                        var apiResponse = System.Text.Json.JsonSerializer.Deserialize<List<Branch>>(data, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                        var result = apiResponse;

                        return result ?? new List<Branch>();
                    }
                    else
                    {
                        // Handle non-success status codes (like 404) gracefully
                        Console.WriteLine($"API Error: {response.StatusCode}");
                        return new List<Branch>();
                    }
                }

            }
            catch (System.Exception ex)
            {
                ViewBag.ErrorMessage = "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;
                return new List<Branch>();
            }
        }
    
    
    }
}
