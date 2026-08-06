using webCRM.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace webCRM.Controllers
{
    public class ProspectAssignController(IConfiguration configuration) : Controller
    {
        string? bearerToken = Environment.GetEnvironmentVariable("ApiSettings__BearerToken") ?? configuration["ApiSettings:BearerToken"];
        string? domain = Environment.GetEnvironmentVariable("ApiSettings__APIDomain") ?? configuration["ApiSettings:APIDomain"];

        public async Task<IActionResult> Index()
        {
            return View("prospectAssign");
        }

        [HttpPut]
        public async Task<IActionResult> UpdateProspectCustomer([FromBody] UpdateProspectCustomerRequest request)
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
                    var personalId = HttpContext.Session.GetString("personalId") ?? "";
                    request.assigner = personalId;
                    request.updated_by = personalId;

                    var response = await client.PostAsync($"{domain}/crm/api/v1/p3/updateProspectCustomer", new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json"));
                    string data = await response.Content.ReadAsStringAsync();
                    if (!response.IsSuccessStatusCode)
                    {
                        return Content(string.IsNullOrEmpty(data) ? $"{{\"status\": false, \"message\": \"API return error {(int)response.StatusCode}: {response.ReasonPhrase}\", \"data\": []}}" : data, "application/json");
                    }
                    return Content(data, "application/json");
                }
            }
            catch (System.Exception ex)
            {
                ViewBag.ErrorMessage = "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;
                return Content("{\"status\": false, \"message\": \"" + ex.Message + "\", \"data\": []}", "application/json");
            }
        }

    }
}
