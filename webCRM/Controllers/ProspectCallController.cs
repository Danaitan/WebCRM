using webCRM.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace webCRM.Controllers
{
    public class ProspectCallController(IConfiguration configuration) : Controller
    {
        string? bearerToken = Environment.GetEnvironmentVariable("ApiSettings__BearerToken") ?? configuration["ApiSettings:BearerToken"];
        string? domain = Environment.GetEnvironmentVariable("ApiSettings__APIDomain") ?? configuration["ApiSettings:APIDomain"];

        public async Task<IActionResult> Index()
        {
            return View("prospectCall");
        }

        public async Task<IActionResult> GetDropDown()
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
                    var response = await client.GetAsync($"{domain}/crm/api/v1/p3/getMasterDropdown?pageTitle=ขายและติดตาม");
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
        public async Task<IActionResult> postHistoryCall([FromBody] JsonElement body)
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
                    string jsonPayload = body.GetRawText();
                    var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
                    var response = await client.PostAsync($"{domain}/crm/api/v1/p2/postHistoryCall", content);
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

        [HttpGet]
        public async Task<IActionResult> GetHistoryCall(string prospectBatch, string customerId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(prospectBatch) || string.IsNullOrWhiteSpace(customerId))
                {
                    return Content("[]", "application/json");
                }

                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using (var client = new HttpClient(handler))
                {
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
                    var response = await client.GetAsync($"{domain}/crm/api/v1/p2/getHistoryCall/{prospectBatch}/{customerId}");
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

    }
    
}
