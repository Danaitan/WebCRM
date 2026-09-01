using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Headers;
using System.Text.Json;
using webCRM.Models;

namespace webCRM.Controllers
{
    public class CustomerDetailController(IConfiguration configuration) : Controller
    {
        private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString,
            Converters = { new NumberToStringConverter() }
        };

        string? bearerToken = Environment.GetEnvironmentVariable("ApiSettings__BearerToken") ?? configuration["ApiSettings:BearerToken"];
        string? domain = Environment.GetEnvironmentVariable("ApiSettings__APIDomain") ?? configuration["ApiSettings:APIDomain"];

        public async Task<IActionResult> Index()
        {
            var fullNameEn = HttpContext.Session.GetString("fullNameEn");
            if (!string.IsNullOrEmpty(fullNameEn))
            {
                ViewData["fullNameEn"] = fullNameEn;
            }

            var result = await GetCustomerList("");
            var viewModel = new CustomerDetailViewModel
            {
                Customers = result
            };
            return View("customerDetail", viewModel);
        }

        public async Task<List<ResponseCustomerDetail>> GetCustomerList(string idno)
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
                    var response = await client.GetAsync($"{domain}/crm/api/v1/customerLists/{idno}");
                    response.EnsureSuccessStatusCode();
                    string data = await response.Content.ReadAsStringAsync();
                    if (response.IsSuccessStatusCode)
                    {
                        var apiResponse = System.Text.Json.JsonSerializer.Deserialize<CustomerDetailApiResponse>(data, _jsonSerializerOptions);
                        var result = apiResponse?.Customer;

                        return result ?? new List<ResponseCustomerDetail>();
                    }
                }

            }
            catch (System.Exception ex)
            {
                ViewBag.ErrorMessage = "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;
            }

            return new List<ResponseCustomerDetail>();
        }

        [HttpGet]
        public async Task<ResponseContactList> GetContact(string idno)
        {

            try
            {
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using (var client = new HttpClient(handler))
                {
                    List<string> companyCode = new List<string>
                    {
                        "Micro",
                        "MFIN",
                        "MIB"
                    };

                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

                    ResponseContactList result = new ResponseContactList();

                    foreach (string code in companyCode)
                    {
                        var response = await client.GetAsync($"{domain}/crm/api/v1/contactLists/{idno}/{code}");
                        string data = await response.Content.ReadAsStringAsync();
                        if (code == "Micro")
                        {
                            var apiResponse = System.Text.Json.JsonSerializer.Deserialize<List<ResponseContact>>(data, _jsonSerializerOptions);
                            result.contactMicro = apiResponse ?? new List<ResponseContact>();
                            result.contactMicroCount = apiResponse?.Count() ?? 0;
                        }
                        if (code == "MFIN")
                        {
                            var apiResponse = System.Text.Json.JsonSerializer.Deserialize<List<ResponseContact>>(data, _jsonSerializerOptions);
                            result.contactMFIN = apiResponse ?? new List<ResponseContact>();
                            result.contactMFINCount = apiResponse?.Count() ?? 0;
                        }
                        if (code == "MIB")
                        {
                            var apiResponse = System.Text.Json.JsonSerializer.Deserialize<List<ResponseContact>>(data, _jsonSerializerOptions);
                            result.contactMIB = apiResponse ?? new List<ResponseContact>();
                            result.contactMIBCount = apiResponse?.Count() ?? 0;
                        }

                    }
                    return result;

                }

            }
            catch (System.Exception ex)
            {
                ViewBag.ErrorMessage = "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;
            }

            return new ResponseContactList();
        }

        [HttpGet]
        public async Task<IActionResult> GetContactInfo(string idno, string company)
        {
            if (company == "Micro")
            {
                var result = await GetContactInfoInternal<ContractInfoMicro>(idno, company);
                return Ok(result);
            }
            else if (company == "MFIN")
            {
                var result = await GetContactInfoInternal<ContractInfoMFIN>(idno, company);
                return Ok(result);
            }
            else if (company == "MIB")
            {
                var result = await GetContactInfoInternal<ContractInfoMIB>(idno, company);
                return Ok(result);
            }

            return BadRequest("Invalid company code.");
        }

        private async Task<ResponseContactInfo<TContractInfo>?> GetContactInfoInternal<TContractInfo>(
            string idno,
            string company
            )
            where TContractInfo : ContractInfo
        {
            var handler = new HttpClientHandler
            {
                ServerCertificateCustomValidationCallback = (_, _, _, _) => true
            };

            using var client = new HttpClient(handler);

            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", configuration["ApiSettings:BearerToken"]);

            var domain = Environment.GetEnvironmentVariable("ApiSettings__APIDomain") ?? configuration["ApiSettings:APIDomain"];
            var response = await client.GetAsync($"{domain}/crm/api/v1/contactInfo/{idno}/{company}");
            response.EnsureSuccessStatusCode();
            string data = await response.Content.ReadAsStringAsync();

            var result = JsonSerializer.Deserialize<ResponseContactInfo<TContractInfo>>(data, _jsonSerializerOptions);

            return result;
        }

        public async Task<IActionResult> GetReceiveList(string contno, string company)
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
                    var response = await client.GetAsync($"{domain}/crm/api/v1/receiveInfo/{contno}/{company}");
                    
                    if (response.IsSuccessStatusCode)
                    {
                        string data = await response.Content.ReadAsStringAsync();
                        return Content(data, "application/json");
                    }
                }
            }
            catch (System.Exception ex)
            {
                ViewBag.ErrorMessage = "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;
            }

            return Content("[]", "application/json");
        }

        public async Task<List<ResponseClaim>> GetClaimList(string tracking)
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
                    var response = await client.GetAsync($"{domain}/crm/api/v1/claimInfo/{tracking}");
                    response.EnsureSuccessStatusCode();
                    string data = await response.Content.ReadAsStringAsync();
                    if (response.IsSuccessStatusCode)
                    {
                        var apiResponse = System.Text.Json.JsonSerializer.Deserialize<List<ResponseClaim>>(data, _jsonSerializerOptions);
                        var result = apiResponse;

                        return result ?? new List<ResponseClaim>();
                    }
                }

            }
            catch (System.Exception ex)
            {
                ViewBag.ErrorMessage = "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;
            }

            return new List<ResponseClaim>();
        }

        public async Task<IActionResult> GetPDPA(string company)
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
                    var response = await client.GetAsync($"{domain}/crm/api/v1/p3/getpdpa?company={company}");
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
        
        public async Task<IActionResult> GetCheckPDPA(string idno)
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
                    var response = await client.GetAsync($"{domain}/crm/api/v1/p3/getCheckPDPA?idno={idno}");
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
