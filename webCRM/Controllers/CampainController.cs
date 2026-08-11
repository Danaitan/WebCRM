using webCRM.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Runtime.CompilerServices;

namespace webCRM.Controllers
{
    public class CampainController(IConfiguration configuration) : Controller
    {
        string? bearerToken = Environment.GetEnvironmentVariable("ApiSettings__BearerToken") ?? configuration["ApiSettings:BearerToken"];
        string? domain = Environment.GetEnvironmentVariable("ApiSettings__APIDomain") ?? configuration["ApiSettings:APIDomain"];
        public async Task<IActionResult> Index()
        {
            return View("campain");
        }

        public async Task<CampainPagedResult> GetCampainList(
            string page = "1",
            string pageSize = "10",
            string status = "",
            string startDate = "",
            string endDate = "",
            string branch = "",
            string createdBy = ""
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
                    string userId = HttpContext.Session.GetString("personalId") ?? "";
                    string reqPage = string.IsNullOrEmpty(page) ? "1" : page;
                    string reqPageSize = string.IsNullOrEmpty(pageSize) ? "20" : pageSize;
                    
                    if(string.IsNullOrEmpty(createdBy))
                    {
                        createdBy = userId;
                    }

                    string url = $"{domain}/crm/api/v1/p2/getProductsPhase3/{createdBy}/{reqPage}/{reqPageSize}";
                    if (!string.IsNullOrEmpty(status))
                    {
                        url += $"?status={status}";
                    }
                    if (!string.IsNullOrEmpty(startDate))
                    {
                        url += $"?startDate={startDate}";
                    }
                    if (!string.IsNullOrEmpty(endDate))
                    {
                        url += $"?endDate={endDate}";
                    }
                    if (!string.IsNullOrEmpty(branch))
                    {
                        url += $"?branch={branch}";
                    }
                    var response = await client.GetAsync(url);
                    response.EnsureSuccessStatusCode();
                    string data = await response.Content.ReadAsStringAsync();
                    if (response.IsSuccessStatusCode)
                    {
                        var apiResponse = System.Text.Json.JsonSerializer.Deserialize<CampainPagedResult>(data, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                        var result = apiResponse;

                        return result ?? new CampainPagedResult();
                    }

                }

            }
            catch (System.Exception ex)
            {
                ViewBag.ErrorMessage = "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;
                return new CampainPagedResult();
            }

            return new CampainPagedResult();

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

                    var response = await client.PutAsync($"{domain}/crm/api/v1/p2/putProductRemove/{productId}", null);
                    if (response.IsSuccessStatusCode)
                    {
                        return "Remove Success";
                    }

                    var getResponse = await client.GetAsync($"{domain}/crm/api/v1/p2/putProductRemove/{productId}");
                    if (getResponse.IsSuccessStatusCode)
                    {
                        return "Remove Success";
                    }

                    var deleteResponse = await client.DeleteAsync($"{domain}/crm/api/v1/p2/putProductRemove/{productId}");
                    if (deleteResponse.IsSuccessStatusCode)
                    {
                        return "Remove Success";
                    }

                    var lastResponse = response.StatusCode != System.Net.HttpStatusCode.MethodNotAllowed ? response : getResponse;
                    string errStr = await lastResponse.Content.ReadAsStringAsync();
                    return $"Remove Failed: ({lastResponse.StatusCode}) {errStr}";
                }
            }
            catch (System.Exception ex)
            {
                ViewBag.ErrorMessage = "เกิดข้อผิดพลาดในการลบข้อมูล: " + ex.Message;
                return "Remove Failed: " + ex.Message;
            }
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

        public async Task<List<MasterFilter>> GetMasterFilter()
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
                    var company = HttpContext.Session.GetString("company");
                    var response = await client.GetAsync($"{domain}/crm/api/v1/p2/getMasterFilter/{company}");

                    if (response.IsSuccessStatusCode)
                    {
                        string data = await response.Content.ReadAsStringAsync();
                        var apiResponse = System.Text.Json.JsonSerializer.Deserialize<List<MasterFilter>>(data, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                        var result = apiResponse;

                        return result ?? new List<MasterFilter>();
                    }
                    else
                    {
                        Console.WriteLine($"API Error: {response.StatusCode}");
                        return new List<MasterFilter>();
                    }
                }

            }
            catch (System.Exception ex)
            {
                ViewBag.ErrorMessage = "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;
                return new List<MasterFilter>();
            }

        }

        [HttpPost]
        public async Task<IActionResult> InsertFilter([FromBody] List<PostFilter> request)
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
                    JsonSerializer.Serialize(request),
                    Encoding.UTF8,
                    "application/json");

                var response = await client.PostAsync(
                    $"{domain}/crm/api/v1/p2/postNewProductFilter",
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

        [HttpGet]
        public async Task<List<GetFilterByGuid>> GetFilterByGuid(string fguid)
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
                    var company = HttpContext.Session.GetString("company");
                    var response = await client.GetAsync($"{domain}/crm/api/v1/p2/getProductFilterByGuid/{fguid}/{company}");

                    if (response.IsSuccessStatusCode)
                    {
                        string data = await response.Content.ReadAsStringAsync();
                        var apiResponse = System.Text.Json.JsonSerializer.Deserialize<List<GetFilterByGuid>>(data, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                        var result = apiResponse;

                        return result ?? new List<GetFilterByGuid>();
                    }
                    else
                    {
                        Console.WriteLine($"API Error: {response.StatusCode}");
                        return new List<GetFilterByGuid>();
                    }
                }

            }
            catch (System.Exception ex)
            {
                ViewBag.ErrorMessage = "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;
                return new List<GetFilterByGuid>();
            }
        }

        [HttpPut]
        public async Task<IActionResult> UpdateCampaign([FromBody] PostCampaign request)
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
                    var response = await client.PutAsync($"{domain}/crm/api/v1/p2/putProductsPhase3",
                        new StringContent(
                            JsonSerializer.Serialize(request),
                            Encoding.UTF8,
                            "application/json"));

                    string json = await response.Content.ReadAsStringAsync();
                    if (!response.IsSuccessStatusCode)
                    {
                        return Ok(new
                        {
                            status = "error",
                            message = $"API responded with status code: {response.StatusCode}",
                            detail = json
                        });
                    }
                    return Ok(new { status = "success", data = json });
                }
            }
            catch (System.Exception ex)
            {
                return Ok(new { status = "error", message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetProspect(int page = 1, int pageSize = 10)
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
                    var response = await client.GetAsync($"{domain}/crm/api/v1/p2/getProspect_phase3/{page}/{pageSize}");
                    response.EnsureSuccessStatusCode();
                    string data = await response.Content.ReadAsStringAsync();
                    return Content(data, "application/json");
                }
            }
            catch (System.Exception ex)
            {
                ViewBag.ErrorMessage = "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;
                return Content("{\"page\": " + page + ", \"pageSize\": " + pageSize + ", \"count\": 0, \"data\": []}", "application/json");
            }
        }

        public async Task<string> GetCheckProductNo()
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
                    var response = await client.GetAsync($"{domain}/crm/api/v1/p2/getCheckProductNo");
                    response.EnsureSuccessStatusCode();
                    string data = await response.Content.ReadAsStringAsync();
                    return data;
                }
            }
            catch (System.Exception ex)
            {
                ViewBag.ErrorMessage = "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;
                return "";
            }
        }

        [HttpGet]
        public async Task<IActionResult> getMasterObjective()
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
                    var response = await client.GetAsync($"{domain}/crm/api/v1/p3/getMasterObjective");
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
