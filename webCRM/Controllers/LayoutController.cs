
using webCRM.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace webCRM.Controllers
{
    public class LayoutController(IConfiguration configuration) : Controller
    {
        string? bearerToken = Environment.GetEnvironmentVariable("ApiSettings__BearerToken") ?? configuration["ApiSettings:BearerToken"];
        string? domain = Environment.GetEnvironmentVariable("ApiSettings__APIDomain") ?? configuration["ApiSettings:APIDomain"];

        public async Task<IActionResult> Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> GetNotification()
        {
            try
            {
                string queryString = Request.QueryString.Value ?? "";

                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using (var client = new HttpClient(handler))
                {
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
                    var response = await client.GetAsync($"{domain}/crm/api/v1/p3/getNotification{queryString}");
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

        [HttpPut]
        public async Task<IActionResult> UpdateNotification([FromBody] UpdateNotificationRequest request)
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
                    var response = await client.PutAsync($"{domain}/crm/api/v1/p3/updateNotification",
                        new StringContent(JsonSerializer.Serialize(request),
                        Encoding.UTF8,
                        "application/json"
                        ));

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

        [HttpPut]
        public async Task<IActionResult> DeleteNotification([FromBody] DeleteNotificationRequest request)
        {
            try
            {
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using (var client = new HttpClient(handler))
                {
                    if (long.TryParse(HttpContext.Session.GetString("personalId"), out long pId))
                    {
                        request.receiver = pId;
                    }
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
                    var response = await client.PutAsync($"{domain}/crm/api/v1/p3/deleteNotification",
                        new StringContent(JsonSerializer.Serialize(request),
                        Encoding.UTF8,
                        "application/json"
                        ));

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
