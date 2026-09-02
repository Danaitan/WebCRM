
using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.WebUtilities;
using webCRM.Models;
using System.Text;
using System.Text.Json;

namespace webCRM.Controllers
{
    public class ManageUserController(IConfiguration configuration) : Controller
    {
        string? bearerToken = Environment.GetEnvironmentVariable("ApiSettings__BearerToken") ?? configuration["ApiSettings:BearerToken"];
        string? domain = Environment.GetEnvironmentVariable("ApiSettings__APIDomain") ?? configuration["ApiSettings:APIDomain"];
        public async Task<IActionResult> Index()
        {
            return View("manageUser");
        }

        [HttpGet]
        public async Task<IActionResult> GetpersonalwithRole(
          int page,
          int pageSize,
          string search,
          string depart_code,
          string branch_no,
          string abbreviation
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
                    var url = $"{domain}/crm/api/v1/p3/getpersonalwithRole";
                    var queryParams = new Dictionary<string, string?>
                    {
                        ["page"] = page.ToString(),
                        ["pageSize"] = pageSize.ToString(),
                        ["search"] = search,
                        ["depart_code"] = depart_code,
                        ["branch_no"] = branch_no,
                        ["abbreviation"] = abbreviation
                    };
                    url = QueryHelpers.AddQueryString(url, queryParams);
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

        [HttpGet]
        public async Task<IActionResult> GetCRMRoles()
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
                    var response = await client.GetAsync($"{domain}/crm/api/v1/p3/getCRMRoles");
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

        [HttpGet]
        public async Task<IActionResult> GetPageSidebar()
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
                    var response = await client.GetAsync($"{domain}/crm/api/v1/p3/getPageSidebar");
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

        [HttpPost]
        public async Task<IActionResult> PostCRMPersonalRole([FromBody] PostCRMPersonalRoleRequest request)
        {

            try
            {
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using var client = new HttpClient(handler);

                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

                request.create_by = HttpContext.Session.GetString("personalId") ?? "";

                if (string.IsNullOrWhiteSpace(request.role_id) && string.IsNullOrWhiteSpace(request.personnel_code))
                {
                    return Ok(new { status = "error", message = "Receiver or ReceiverEmail is required." });
                }

                var content = new StringContent(
                    JsonSerializer.Serialize(request),
                    Encoding.UTF8,
                    "application/json");

                var response = await client.PostAsync(
                    $"{domain}/crm/api/v1/p3/postCRMPersonalRole",
                    content);

                if (!response.IsSuccessStatusCode)
                {
                    return Ok(new { status = "error", message = $"API responded with status code: {response.StatusCode}" });
                }

                return Ok(new { status = "success" });
            }
            catch (Exception ex)
            {
                return Ok(new { status = "error", message = ex.Message });
            }

        }

        [HttpPost]
        public async Task<IActionResult> PostPageRole([FromBody] PostPageRoleRequest request)
        {

            try
            {
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using var client = new HttpClient(handler);

                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

                request.CreatedBy = HttpContext.Session.GetString("personalId") ?? "";

                if (string.IsNullOrWhiteSpace(request.RoleId) || string.IsNullOrWhiteSpace(request.PageId))
                {
                    return Ok(new { status = "error", message = "RoleId and PageId are required." });
                }

                var content = new StringContent(
                    JsonSerializer.Serialize(request),
                    Encoding.UTF8,
                    "application/json");

                var response = await client.PostAsync(
                    $"{domain}/crm/api/v1/p3/postPageRole",
                    content);

                if (!response.IsSuccessStatusCode)
                {
                    return Ok(new { status = "error", message = $"API responded with status code: {response.StatusCode}" });
                }

                return Ok(new { status = "success" });
            }
            catch (Exception ex)
            {
                return Ok(new { status = "error", message = ex.Message });
            }

        }

        [HttpPost]
        public async Task<IActionResult> PostCRMRole([FromBody] PostCRMRoleRequest request)
        {

            try
            {
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using var client = new HttpClient(handler);

                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

                request.create_by = HttpContext.Session.GetString("personalId") ?? "";

                if (string.IsNullOrWhiteSpace(request.role_name))
                {
                    return Ok(new { status = "error", message = "Role name is required." });
                }

                var content = new StringContent(
                    JsonSerializer.Serialize(request),
                    Encoding.UTF8,
                    "application/json");

                var response = await client.PostAsync(
                    $"{domain}/crm/api/v1/p3/postCRMRole",
                    content);

                if (!response.IsSuccessStatusCode)
                {
                    return Ok(new { status = "error", message = $"API responded with status code: {response.StatusCode}" });
                }

                return Ok(new { status = "success" });
            }
            catch (Exception ex)
            {
                return Ok(new { status = "error", message = ex.Message });
            }

        }

        [HttpDelete]
        public async Task<IActionResult> DeleteCRMRole([FromBody] DeleteCRMRoleRequest request)
        {
            try
            {
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using var client = new HttpClient(handler);

                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

                request.update_by = HttpContext.Session.GetString("personalId") ?? "";

                if (string.IsNullOrWhiteSpace(request.role_id))
                {
                    return Ok(new { status = "error", message = "Role ID is required." });
                }

                var content = new StringContent(
                    JsonSerializer.Serialize(request),
                    Encoding.UTF8,
                    "application/json");

                var response = await client.PostAsync(
                    $"{domain}/crm/api/v1/p3/deleteCRMRole",
                    content);

                if (!response.IsSuccessStatusCode)
                {
                    return Ok(new { status = "error", message = $"API responded with status code: {response.StatusCode}" });
                }

                return Ok(new { status = "success" });
            }
            catch (Exception ex)
            {
                return Ok(new { status = "error", message = ex.Message });
            }
        }

        [HttpDelete]
        public async Task<IActionResult> DeleteCRMPersonalRole([FromBody] DeleteCRMPersonalRoleRequest request)
        {
            try
            {
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using var client = new HttpClient(handler);

                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

                request.update_by = HttpContext.Session.GetString("personalId") ?? "";

                if (string.IsNullOrWhiteSpace(request.personnel_code) || string.IsNullOrWhiteSpace(request.role_id))
                {
                    return Ok(new { status = "error", message = "personnel_code and role_id are required." });
                }

                var content = new StringContent(
                    JsonSerializer.Serialize(request),
                    Encoding.UTF8,
                    "application/json");

                var response = await client.PostAsync(
                    $"{domain}/crm/api/v1/p3/deleteCRMPersonalRole",
                    content);

                if (!response.IsSuccessStatusCode)
                {
                    return Ok(new { status = "error", message = $"API responded with status code: {response.StatusCode}" });
                }

                return Ok(new { status = "success" });
            }
            catch (Exception ex)
            {
                return Ok(new { status = "error", message = ex.Message });
            }
        }

        [HttpPut]
        public async Task<IActionResult> UpdateStatusPersonalRole([FromBody] UpdateStatusPersonalRoleRequest request)
        {
            try
            {
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using (var client = new HttpClient(handler))
                {
                    request.status = "unable";
                    request.user = HttpContext.Session.GetString("personalId") ?? "";
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
                    var response = await client.PutAsync($"{domain}/crm/api/v1/p3/updateStatusPersonalRole",
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

        [HttpPut]
        public async Task<IActionResult> UpdateCRMRole([FromBody] UpdateCRMRoleRequest request)
        {
            try
            {
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using (var client = new HttpClient(handler))
                {
                    request.user = HttpContext.Session.GetString("personalId") ?? "";
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
                    var response = await client.PutAsync($"{domain}/crm/api/v1/p3/updateCRMRole",
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
        public async Task<IActionResult> GetFunc()
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
                    var response = await client.GetAsync($"{domain}/crm/api/v1/p3/getFunc");
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

        [HttpPost]
        public async Task<IActionResult> UpsertRoleFunc([FromBody] UpsertRoleFuncRequest request)
        {

            try
            {
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using var client = new HttpClient(handler);

                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

                request.user = HttpContext.Session.GetString("personalId") ?? "";

                if (string.IsNullOrWhiteSpace(request.role_id))
                {
                    return Ok(new { status = "error", message = "Role id is required." });
                }

                if (string.IsNullOrWhiteSpace(request.func_id))
                {
                    return Ok(new { status = "error", message = "Function id is required." });
                }

                var content = new StringContent(
                    JsonSerializer.Serialize(request),
                    Encoding.UTF8,
                    "application/json");

                var response = await client.PostAsync(
                    $"{domain}/crm/api/v1/p3/UpsertRoleFunc",
                    content);

                if (!response.IsSuccessStatusCode)
                {
                    return Ok(new { status = "error", message = $"API responded with status code: {response.StatusCode}" });
                }

                return Ok(new { status = "success" });
            }
            catch (Exception ex)
            {
                return Ok(new { status = "error", message = ex.Message });
            }

        }

        [HttpPut]
        public async Task<IActionResult> UpdateVariableFunc([FromBody] UpdateVariableFuncRequest request)
        {
            try
            {
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using (var client = new HttpClient(handler))
                {
                    request.user = HttpContext.Session.GetString("personalId") ?? "";
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
                    var response = await client.PutAsync($"{domain}/crm/api/v1/p3/updateVariableFunc",
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



