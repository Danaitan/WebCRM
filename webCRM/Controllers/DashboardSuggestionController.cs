
using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.WebUtilities;

namespace webCRM.Controllers
{
    public class DashboardSuggestionController(
        IConfiguration configuration) : Controller
    {

        string? bearerToken = Environment.GetEnvironmentVariable("ApiSettings__BearerToken") ?? configuration["ApiSettings:BearerToken"];
        string? domain = Environment.GetEnvironmentVariable("ApiSettings__APIDomain") ?? configuration["ApiSettings:APIDomain"];

        public async Task<IActionResult> Index()
        {
            return View("~/Views/Home/Dashboard/suggestion.cshtml");
        }

        public async Task<IActionResult> GetSuggestionDashboard(
            string? startdate,
            string? enddate,
            string? provider,
            string? topic,
            string? status
        )
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
                    if (startdate != null)
                        queryParams["startdate"] = startdate;
                    if (enddate != null)
                        queryParams["enddate"] = enddate;
                    if (!string.IsNullOrEmpty(provider))
                        queryParams["provider"] = provider;
                    if (!string.IsNullOrEmpty(topic))
                        queryParams["topic"] = topic;
                    if (!string.IsNullOrEmpty(status))
                        queryParams["status"] = status;

                    var url = QueryHelpers.AddQueryString(
                        $"{domain}/crm/api/v1/p3/suggestionDashboard", queryParams);
                    var response = await client.GetAsync(url);
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

        public async Task<IActionResult> GetPersonalAndGroup()
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

                    var response = await client.GetAsync($"{domain}/crm/api/v1/p3/getPersonalAndGroup");
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
