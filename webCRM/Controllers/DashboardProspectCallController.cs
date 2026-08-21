
using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.WebUtilities;

namespace webCRM.Controllers
{
    public class DashboardProspectCallController(
        IConfiguration configuration) : Controller
    {

        string? bearerToken = Environment.GetEnvironmentVariable("ApiSettings__BearerToken") ?? configuration["ApiSettings:BearerToken"];
        string? domain = Environment.GetEnvironmentVariable("ApiSettings__APIDomain") ?? configuration["ApiSettings:APIDomain"];

        public async Task<IActionResult> Index()
        {
            return View("~/Views/Home/Dashboard/prospectCall.cshtml");
        }

        public async Task<IActionResult> GetCallDashboard(
            string? startdate,
            string? enddate,
            string? call_type,
            string? branch,
            string? call_by,
            string? call_result,
            string? campaign_name
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
                    if (!string.IsNullOrEmpty(call_type))
                        queryParams["call_type"] = call_type;
                    if (!string.IsNullOrEmpty(branch))
                        queryParams["branch"] = branch;
                    if (!string.IsNullOrEmpty(call_by))
                        queryParams["call_by"] = call_by;
                    if (!string.IsNullOrEmpty(call_result))
                        queryParams["call_result"] = call_result;
                    if (!string.IsNullOrEmpty(campaign_name))
                        queryParams["campaign_name"] = campaign_name;

                    var url = QueryHelpers.AddQueryString(
                        $"{domain}/crm/api/v1/p3/callDashboard", queryParams);

                    var response = await client.GetAsync(url);
                    response.EnsureSuccessStatusCode();
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

        public async Task<IActionResult> GetCallResult()
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
                    var response = await client.GetAsync($"{domain}/crm/api/v1/p3/getMasterDropdown?pageTitle=ขายและติดตาม&DropdownTitle=ผลการติดต่อ");
                    response.EnsureSuccessStatusCode();
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

        public async Task<IActionResult> GetEmployeeList(string branch)
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
                    
                    var url = QueryHelpers.AddQueryString(
                        $"{domain}/crm/api/v1/p3/getEmployeeList", queryParams);

                    var response = await client.GetAsync(url);

                    response.EnsureSuccessStatusCode();
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
