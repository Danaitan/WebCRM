using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using webCRM.Models;
using Microsoft.AspNetCore.WebUtilities;

namespace webCRM.Services
{
    public class CRMService(
        IHttpClientFactory httpClientFactory,
        ILogger<CRMService> logger)
    {
        private readonly HttpClient _httpClient =
            httpClientFactory.CreateClient("CRMApi");

        private readonly ILogger<CRMService> _logger = logger;

        private readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        // GET
        private async Task<T?> GetAsync<T>(string endpoint)
        {
            try
            {
                var response = await _httpClient.GetAsync(endpoint);

                response.EnsureSuccessStatusCode();

                return await response.Content
                    .ReadFromJsonAsync<T>(_jsonOptions);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error fetching data from {Endpoint}",
                    endpoint);

                throw;
            }
        }

        private async Task<string> GetStringAsync(string endpoint)
        {
            try
            {
                var response = await _httpClient.GetAsync(endpoint);

                response.EnsureSuccessStatusCode();

                return await response.Content.ReadAsStringAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error fetching data from {Endpoint}",
                    endpoint);

                throw;
            }
        }

        // POST
        private async Task<HttpResponseMessage> PostAsync<T>(string endpoint, T data)
        {
            try
            {
                return await _httpClient.PostAsJsonAsync(
                    endpoint,
                    data,
                    _jsonOptions);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error posting data to {Endpoint}",
                    endpoint);

                throw;
            }
        }

        // PUT
        private async Task<HttpResponseMessage> PutAsync<T>(string endpoint, T data)
        {
            try
            {
                return await _httpClient.PutAsJsonAsync(
                    endpoint,
                    data,
                    _jsonOptions);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error putting data to {Endpoint}",
                    endpoint);

                throw;
            }
        }

        #region CampaignController
        public async Task<CampainPagedResult> GetCampainList(
            string page = "1",
            string pageSize = "10",
            string status = "",
            string startDate = "",
            string endDate = "",
            string branch = "",
            string search = "",
            string sortCreateDate = "",
            string offCde = "",
            string company = "",
            string assingUser = ""
            )
        {
            string reqPage =
                string.IsNullOrEmpty(page) ? "1" : page;

            string reqPageSize =
                string.IsNullOrEmpty(pageSize) ? "10" : pageSize;

            string url =
                $"p2/getProductsPhase3/{reqPage}/{reqPageSize}";

            var queryParams = new List<string>();

            if (!string.IsNullOrEmpty(status))
            {
                queryParams.Add(
                    $"status={Uri.EscapeDataString(status)}");
            }

            if (!string.IsNullOrEmpty(startDate))
            {
                queryParams.Add(
                    $"startDate={Uri.EscapeDataString(startDate)}");
            }

            if (!string.IsNullOrEmpty(endDate))
            {
                queryParams.Add(
                    $"endDate={Uri.EscapeDataString(endDate)}");
            }

            if (!string.IsNullOrEmpty(branch))
            {
                queryParams.Add(
                    $"branch={Uri.EscapeDataString(branch)}");
            }

            if (!string.IsNullOrEmpty(search))
            {
                queryParams.Add(
                    $"search={Uri.EscapeDataString(search)}");
            }

            if (!string.IsNullOrEmpty(sortCreateDate))
            {
                queryParams.Add(
                    $"sortCreateDate={Uri.EscapeDataString(sortCreateDate)}");
            }

            if (!string.IsNullOrEmpty(offCde))
            {
                queryParams.Add(
                    $"offCde={Uri.EscapeDataString(offCde)}");
            }

            if (!string.IsNullOrEmpty(company))
            {
                queryParams.Add(
                    $"company={Uri.EscapeDataString(company)}");
            }

            if (!string.IsNullOrEmpty(assingUser))
            {
                queryParams.Add(
                    $"assingUser={Uri.EscapeDataString(assingUser)}");
            }

            if (queryParams.Count > 0)
            {
                url += "?" + string.Join("&", queryParams);
            }

            return await GetAsync<CampainPagedResult>(url)
                ?? new CampainPagedResult();
        }

        public async Task<(bool Success, int StatusCode, string Error)> DeleteCampain(string productId)
        {
            try
            {
                var endpoint = $"p2/putProductRemove/{Uri.EscapeDataString(productId)}";
                var response = await _httpClient.PutAsync(endpoint, null);
                string error = await response.Content.ReadAsStringAsync();

                return (
                    response.IsSuccessStatusCode,
                    (int)response.StatusCode,
                    error
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error deleting campaign {ProductId}",
                    productId);

                throw;
            }
        }

        public async Task<(bool Success, int StatusCode, string Response)> PostCampain(PostCampaign request)
        {
            try
            {
                var response = await PostAsync(
                    "p2/postNewProduct",
                    new[] { request });

                string json =
                    await response.Content.ReadAsStringAsync();

                return (
                    response.IsSuccessStatusCode,
                    (int)response.StatusCode,
                    json
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error posting campaign");

                throw;
            }
        }

        public async Task<List<Branch>> GetBranchListForCRM()
        {
            try
            {
                return await GetAsync<List<Branch>>("p2/getBranchListForCRM") ?? new List<Branch>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading CRM branch list");
                throw;
            }
        }

        public async Task<List<MasterFilter>> GetMasterFilter(string company)
        {
            try
            {
                var comp = string.IsNullOrWhiteSpace(company) ? "MICRO" : company;
                var endpoint = $"p2/getMasterFilter/{Uri.EscapeDataString(comp)}";
                var root = await GetAsync<JsonNode>(endpoint);
                if (root == null)
                {
                    return new List<MasterFilter>();
                }

                List<MasterFilter>? list = null;

                if (root is JsonArray)
                {
                    list = root.Deserialize<List<MasterFilter>>(
                        _jsonOptions);
                }
                else if (root is JsonObject obj)
                {
                    if (obj["data"] is JsonArray data)
                    {
                        list = data.Deserialize<List<MasterFilter>>(_jsonOptions);
                    }
                    else if (obj["result"] is JsonArray result)
                    {
                        list = result.Deserialize<List<MasterFilter>>(_jsonOptions);
                    }
                }

                // list = list?
                //     .Where(x =>
                //         !string.IsNullOrWhiteSpace(x.FCode))
                //     .GroupBy(
                //         x => x.FCode!.Trim(),
                //         StringComparer.OrdinalIgnoreCase)
                //     .Select(g => g.First())
                //     .ToList()
                //     ?? new List<MasterFilter>();

                return list ?? new List<MasterFilter>();
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error loading master filter for {Company}",
                    company);

                throw;
            }
        }

        public async Task<(bool Success, int StatusCode, string Response)> InsertFilter(List<PostFilter> request)
        {
            try
            {
                var response = await PostAsync("p2/postNewProductFilter", request);
                string json = await response.Content.ReadAsStringAsync();

                return (
                    response.IsSuccessStatusCode,
                    (int)response.StatusCode,
                    json
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error inserting product filter");

                throw;
            }
        }

        public async Task<List<GetFilterByGuid>> GetFilterByGuid(string fguid)
        {
            try
            {

                var endpoint =
                    $"p2/getProductFilterByGuid/" +
                    $"{Uri.EscapeDataString(fguid)}/";

                var root = await GetAsync<JsonNode>(endpoint);

                if (root == null)
                {
                    return new List<GetFilterByGuid>();
                }

                List<GetFilterByGuid>? list = null;

                if (root is JsonArray)
                {
                    list =
                        root.Deserialize<List<GetFilterByGuid>>(
                            _jsonOptions);
                }
                else if (root is JsonObject obj)
                {
                    if (obj["data"] is JsonArray data)
                    {
                        list =
                            data.Deserialize<List<GetFilterByGuid>>(
                                _jsonOptions);
                    }
                    else if (obj["result"] is JsonArray result)
                    {
                        list =
                            result.Deserialize<List<GetFilterByGuid>>(
                                _jsonOptions);
                    }
                    else if (obj["filters"] is JsonArray filters)
                    {
                        list =
                            filters.Deserialize<List<GetFilterByGuid>>(
                                _jsonOptions);
                    }
                }

                // return list?
                //     .Where(x =>
                //         !string.IsNullOrWhiteSpace(x.fcode))
                //     .GroupBy(
                //         x => x.fcode!.Trim(),
                //         StringComparer.OrdinalIgnoreCase)
                //     .Select(g => g.First())
                //     .ToList()
                //     ?? new List<GetFilterByGuid>();

                return list ?? new List<GetFilterByGuid>();

            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error loading filter by guid {Fguid}",
                    fguid);

                throw;
            }
        }

        public async Task<(bool Success, int StatusCode, string Response)>
        UpdateCampaign(PostCampaign request)
        {
            try
            {
                var response = await PutAsync(
                    "p2/putProductsPhase3",
                    request);

                string json =
                    await response.Content.ReadAsStringAsync();

                return (
                    response.IsSuccessStatusCode,
                    (int)response.StatusCode,
                    json
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error updating campaign");

                throw;
            }
        }
        public async Task<string> GetProspect(int page = 1, int pageSize = 10)
        {
            try
            {
                var endpoint =
                    "p2/getProspect_phase3";

                return await GetAsync<string>(endpoint)
                    ?? "{\"page\":0,\"pageSize\":0,\"count\":0,\"data\":[]}";
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error loading prospect");

                throw;
            }
        }
        public async Task<string> GetCheckProductNo()
        {
            try
            {
                return await GetStringAsync("p2/getCheckProductNo")??"[]";
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error checking product number");

                throw;
            }
        }
        public async Task<string> GetMasterObjective()
        {
            try
            {
                return await GetStringAsync("p3/getMasterObjective") ?? "[]";
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error loading master objective");

                throw;
            }
        }
        public async Task<(bool Success, int StatusCode, long FileId, string Response)> PostFile(PostFile request)
        {
            try
            {
                var response = await PostAsync(
                    "p3/postFile",
                    request);

                string json =
                    await response.Content.ReadAsStringAsync();

                _logger.LogInformation(
                    "PostFile response: StatusCode={StatusCode}, Body={Body}",
                    (int)response.StatusCode,
                    json);

                long fileId = 0;

                if (response.IsSuccessStatusCode)
                {
                    try
                    {
                        using var doc =
                            JsonDocument.Parse(json);

                        // ค้นหา Id แบบยืดหยุ่น รองรับทั้ง object ระดับบนสุด,
                        // array และการห่อด้วย data/Data/result เป็นต้น
                        fileId = ExtractFileId(doc.RootElement);
                    }
                    catch
                    {
                        // Ignore invalid ID response
                    }
                }

                return (
                    response.IsSuccessStatusCode,
                    (int)response.StatusCode,
                    fileId,
                    json
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error posting file");

                throw;
            }
        }

        // ค้นหาค่า file id จาก JSON response แบบยืดหยุ่น
        // รองรับ property ชื่อ Id/id/file_id/fileId ทั้งที่เป็น object,
        // array หรือถูกห่อด้วย data/Data/result/Result
        private static long ExtractFileId(JsonElement element)
        {
            switch (element.ValueKind)
            {
                case JsonValueKind.Object:
                    foreach (var propName in new[] { "Id", "id", "file_id", "fileId", "FileId" })
                    {
                        if (element.TryGetProperty(propName, out var idProp))
                        {
                            if (idProp.ValueKind == JsonValueKind.Number &&
                                idProp.TryGetInt64(out var numId) && numId > 0)
                            {
                                return numId;
                            }
                            if (idProp.ValueKind == JsonValueKind.String &&
                                long.TryParse(idProp.GetString(), out var parsedId) && parsedId > 0)
                            {
                                return parsedId;
                            }
                        }
                    }

                    // ค้นหาในตัวห่อที่พบบ่อย
                    foreach (var wrapper in new[] { "data", "Data", "result", "Result", "response", "Response" })
                    {
                        if (element.TryGetProperty(wrapper, out var wrapped))
                        {
                            var found = ExtractFileId(wrapped);
                            if (found > 0) return found;
                        }
                    }
                    return 0;

                case JsonValueKind.Array:
                    foreach (var item in element.EnumerateArray())
                    {
                        var found = ExtractFileId(item);
                        if (found > 0) return found;
                    }
                    return 0;

                case JsonValueKind.Number:
                    return element.TryGetInt64(out var directId) ? directId : 0;

                case JsonValueKind.String:
                    return long.TryParse(element.GetString(), out var directParsed) ? directParsed : 0;

                default:
                    return 0;
            }
        }

        public async Task<string> GetFile(long id)
        {
            try
            {
                return await GetStringAsync(
                    $"p3/getFile?Id={id}")
                    ?? "[]";
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error getting file {Id}",
                    id);

                throw;
            }
        }

        public async Task<(bool Success, int StatusCode, string Response)> DeleteFile(long id)
        {
            try
            {
                // ส่ง property เป็น PascalCase อย่างชัดเจน เพื่อให้ตรงกับที่ backend คาดหวัง
                // (backend ฝั่ง getFile ใช้ query string ชื่อ "Id" แบบ PascalCase)
                var request = new UpdateFileRequest
                {
                    Id = id,
                    IsActive = false
                };

                var response = await PutAsync(
                    "p3/updateFile",
                    request);

                var body = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError(
                        "updateFile failed. Id={Id}, StatusCode={StatusCode}, Body={Body}",
                        id,
                        (int)response.StatusCode,
                        body);
                }

                return (
                    response.IsSuccessStatusCode,
                    (int)response.StatusCode,
                    body);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error updating file {Id}",
                    id);

                throw;
            }
        }

        public async Task<string> GetProductStatus()
        {
            try
            {
                return await GetStringAsync("p3/getProductStatus") ?? "[]";
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error loading master objective");

                throw;
            }
        }

        #endregion

        #region LoginController

        public async Task<JsonNode?> GetProfileByPersonalCode(
            string personalCode)
        {
            return await GetAsync<JsonNode>(
                $"p2/getProfileByPersonalCode/{Uri.EscapeDataString(personalCode)}");
        }

        public async Task<string> GetPage(string personalCode)
        {
            return await GetStringAsync(
                $"p3/getPage?personalCode={Uri.EscapeDataString(personalCode)}");
        }

        public async Task<string> GetProfile(string user)
        {
            return await GetStringAsync(
                $"p2/getProfileByPersonalCode/{Uri.EscapeDataString(user)}");
        }

        public async Task<string> GetProfileByEmail(string email)
        {
            try
            {
                var response =
                    await _httpClient.PostAsJsonAsync("profile", email);

                response.EnsureSuccessStatusCode();

                return await response.Content.ReadAsStringAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error fetching profile by email");

                throw;
            }
        }

        #endregion

        #region CustomerDetail
        public async Task<List<ResponseCustomerDetail>> GetCustomerList(string idno)
        {
            var data =
                await GetStringAsync(
                    $"customerLists/{Uri.EscapeDataString(idno)}");

            var apiResponse =
                JsonSerializer.Deserialize<CustomerDetailApiResponse>(
                    data,
                    _jsonOptions);

            return apiResponse?.Customer
                ?? new List<ResponseCustomerDetail>();
        }

        public async Task<ResponseContactList> GetContact(string idno)
        {
            var result = new ResponseContactList
            {
                contactMicro = new List<ResponseContact>(),
                contactMFIN = new List<ResponseContact>(),
                contactMIB = new List<ResponseContact>()
            };

            var companyCodes = new[] { "Micro", "MFIN", "MIB" };

            foreach (string code in companyCodes)
            {
                try
                {
                    var data = await GetStringAsync(
                        $"contactLists/{Uri.EscapeDataString(idno)}/{Uri.EscapeDataString(code)}");

                    var contacts = JsonSerializer.Deserialize<List<ResponseContact>>(
                        data,
                        _jsonOptions)
                        ?? new List<ResponseContact>();

                    if (code == "Micro")
                    {
                        result.contactMicro = contacts;
                        result.contactMicroCount = contacts.Count;
                    }
                    else if (code == "MFIN")
                    {
                        result.contactMFIN = contacts;
                        result.contactMFINCount = contacts.Count;
                    }
                    else
                    {
                        result.contactMIB = contacts;
                        result.contactMIBCount = contacts.Count;
                    }
                }
                catch (Exception ex)
                {
                    // Keep the other companies available when one upstream
                    // contact list is unavailable or contains malformed data.
                    _logger.LogError(
                        ex,
                        "Error loading contact list for customer {Idno}, company {CompanyCode}",
                        idno,
                        code);
                }
            }

            return result;
        }

        public async Task<ResponseContactInfo<TContractInfo>?> GetContactInfo<TContractInfo>(string idno, string company) where TContractInfo : ContractInfo
        {
            var data =
                await GetStringAsync(
                    $"contactInfo/" +
                    $"{Uri.EscapeDataString(idno)}/" +
                    $"{Uri.EscapeDataString(company)}");

            return JsonSerializer.Deserialize<
                ResponseContactInfo<TContractInfo>>(
                    data,
                    _jsonOptions);
        }

        public async Task<string> GetReceiveList(string contno, string company)
        {
            return await GetStringAsync(
                $"receiveInfo/" +
                $"{Uri.EscapeDataString(contno)}/" +
                $"{Uri.EscapeDataString(company)}");
        }

        public async Task<List<ResponseClaim>> GetClaimList(string tracking)
        {
            var data =
                await GetStringAsync(
                    $"claimInfo/{Uri.EscapeDataString(tracking)}");

            return JsonSerializer.Deserialize<List<ResponseClaim>>(
                data,
                _jsonOptions)
                ?? new List<ResponseClaim>();
        }

        public async Task<string> GetPDPA(string company)
        {
            return await GetStringAsync($"p3/getpdpa?company={Uri.EscapeDataString(company)}");
        }

        public async Task<string> GetCheckPDPA(string idno)
        {
            return await GetStringAsync($"p3/getCheckPDPA?idno={Uri.EscapeDataString(idno)}");
        }

        #endregion

        #region Dashboard Prospect Call
        public async Task<string> GetCallDashboard(
            string? startdate,
            string? enddate,
            string? call_type,
            string? branch,
            string? call_by,
            string? call_result,
            string? campaign_name)
        {
            var queryParams =
                new Dictionary<string, string?>();

            if (!string.IsNullOrEmpty(startdate))
            {
                queryParams["startdate"] = startdate;
            }

            if (!string.IsNullOrEmpty(enddate))
            {
                queryParams["enddate"] = enddate;
            }

            if (!string.IsNullOrEmpty(call_type))
            {
                queryParams["call_type"] = call_type;
            }

            if (!string.IsNullOrEmpty(branch))
            {
                queryParams["branch"] = branch;
            }

            if (!string.IsNullOrEmpty(call_by))
            {
                queryParams["call_by"] = call_by;
            }

            if (!string.IsNullOrEmpty(call_result))
            {
                queryParams["call_result"] = call_result;
            }

            if (!string.IsNullOrEmpty(campaign_name))
            {
                queryParams["campaign_name"] = campaign_name;
            }

            var endpoint =
                QueryHelpers.AddQueryString(
                    "p3/callDashboard",
                    queryParams);

            return await GetStringAsync(endpoint);
        }

        public async Task<string> GetCallResult()
        {
            var endpoint =
                QueryHelpers.AddQueryString(
                    "p3/getMasterDropdown",
                    new Dictionary<string, string?>
                    {
                        ["pageTitle"] = "ขายและติดตาม",
                        ["DropdownTitle"] = "ผลการติดต่อ"
                    });

            return await GetStringAsync(endpoint);
        }

        public async Task<string> GetEmployeeList(string branch)
        {
            var queryParams =
                new Dictionary<string, string?>();

            if (!string.IsNullOrEmpty(branch))
            {
                queryParams["branch"] = branch;
            }

            var endpoint =
                QueryHelpers.AddQueryString(
                    "p3/getEmployeeList",
                    queryParams);

            return await GetStringAsync(endpoint);
        }

        public async Task<string> GetCallDashboardExcel(
            string? startdate,
            string? enddate,
            string? call_type,
            string? branch,
            string? call_by,
            string? call_result,
            string? campaign_name)
        {
            var queryParams =
                new Dictionary<string, string?>();

            if (!string.IsNullOrEmpty(startdate))
            {
                queryParams["startdate"] = startdate;
            }

            if (!string.IsNullOrEmpty(enddate))
            {
                queryParams["enddate"] = enddate;
            }

            if (!string.IsNullOrEmpty(call_type))
            {
                queryParams["call_type"] = call_type;
            }

            if (!string.IsNullOrEmpty(branch))
            {
                queryParams["branch"] = branch;
            }

            if (!string.IsNullOrEmpty(call_by))
            {
                queryParams["call_by"] = call_by;
            }

            if (!string.IsNullOrEmpty(call_result))
            {
                queryParams["call_result"] = call_result;
            }

            if (!string.IsNullOrEmpty(campaign_name))
            {
                queryParams["campaign_name"] = campaign_name;
            }

            var endpoint =
                QueryHelpers.AddQueryString(
                    "p3/callDashboardExcel",
                    queryParams);

            return await GetStringAsync(endpoint);
        }

        public async Task<string> GetHistoryCallDashboardExcel(
            string? startdate,
            string? enddate,
            string? call_type,
            string? branch,
            string? call_by,
            string? call_result,
            string? campaign_name)
        {
            var queryParams =
                new Dictionary<string, string?>();

            if (!string.IsNullOrEmpty(startdate))
            {
                queryParams["startdate"] = startdate;
            }

            if (!string.IsNullOrEmpty(enddate))
            {
                queryParams["enddate"] = enddate;
            }

            if (!string.IsNullOrEmpty(call_type))
            {
                queryParams["call_type"] = call_type;
            }

            if (!string.IsNullOrEmpty(branch))
            {
                queryParams["branch"] = branch;
            }

            if (!string.IsNullOrEmpty(call_by))
            {
                queryParams["call_by"] = call_by;
            }

            if (!string.IsNullOrEmpty(call_result))
            {
                queryParams["call_result"] = call_result;
            }

            if (!string.IsNullOrEmpty(campaign_name))
            {
                queryParams["campaign_name"] = campaign_name;
            }

            var endpoint =
                QueryHelpers.AddQueryString(
                    "p3/historyCallExcel",
                    queryParams);

            return await GetStringAsync(endpoint);
        }

        #endregion

        #region Dashboard Suggestion
        public async Task<string> GetSuggestionDashboard(
            string? startdate,
            string? enddate,
            string? provider,
            string? branch,
            string? title,
            string? status)
        {
            var queryParams =
                new Dictionary<string, string?>();

            if (!string.IsNullOrEmpty(startdate))
            {
                queryParams["startdate"] = startdate;
            }

            if (!string.IsNullOrEmpty(enddate))
            {
                queryParams["enddate"] = enddate;
            }

            if (!string.IsNullOrEmpty(provider))
            {
                queryParams["provider"] = provider;
            }

            if (!string.IsNullOrEmpty(title))
            {
                queryParams["title"] = title;
            }

            if (!string.IsNullOrEmpty(status))
            {
                queryParams["status"] = status;
            }

            if (!string.IsNullOrEmpty(branch))
            {
                queryParams["branch"] = branch;
            }

            var endpoint =
                QueryHelpers.AddQueryString(
                    "p3/suggestionDashboard",
                    queryParams);

            return await GetStringAsync(endpoint);
        }

        public async Task<string> GetPersonalAndGroup()
        {
            return await GetStringAsync("p3/getPersonalAndGroup");
        }

        public async Task<string> GetSuggestionDashboardExcel(
            string? startdate,
            string? enddate,
            string? provider,
            string? branch,
            string? title,
            string? status)
        {
            var queryParams =
                new Dictionary<string, string?>();

            if (!string.IsNullOrEmpty(startdate))
            {
                queryParams["startdate"] = startdate;
            }

            if (!string.IsNullOrEmpty(enddate))
            {
                queryParams["enddate"] = enddate;
            }

            if (!string.IsNullOrEmpty(provider))
            {
                queryParams["provider"] = provider;
            }

            if (!string.IsNullOrEmpty(title))
            {
                queryParams["title"] = title;
            }

            if (!string.IsNullOrEmpty(status))
            {
                queryParams["status"] = status;
            }

            if (!string.IsNullOrEmpty(branch))
            {
                queryParams["branch"] = branch;
            }

            var endpoint =
                QueryHelpers.AddQueryString(
                    "p3/suggestionDashboardExcel",
                    queryParams);

            return await GetStringAsync(endpoint);
        }

        #endregion

        #region Home Dashboard
        public async Task<MasterData> GetMaster()
        {
            var data = await GetStringAsync("master");
            return JsonSerializer.Deserialize<MasterData>(data, _jsonOptions) ?? new MasterData();
        }

        public async Task<string> GetCustommerDashboard(
            string company,
            string branch,
            string cusType,
            string gender,
            string contactStatus)
        {
            var queryParams =
                new Dictionary<string, string?>();

            if (!string.IsNullOrEmpty(company))
            {
                queryParams["company"] = company;
            }

            if (!string.IsNullOrEmpty(branch))
            {
                queryParams["branch"] = branch;
            }

            if (!string.IsNullOrEmpty(cusType))
            {
                queryParams["cusType"] = cusType;
            }

            if (!string.IsNullOrEmpty(gender))
            {
                queryParams["gender"] = gender;
            }

            if (!string.IsNullOrEmpty(contactStatus))
            {
                queryParams["contactStatus"] = contactStatus;
            }

            var endpoint =
                QueryHelpers.AddQueryString(
                    "p3/customerDashboard",
                    queryParams);

            return await GetStringAsync(endpoint);
        }

        public async Task<string> GetCustommerDashboardDropdown(string company)
        {
            var queryParams =
                new Dictionary<string, string?>();

            if (!string.IsNullOrEmpty(company))
            {
                queryParams["company"] = company;
            }

            var endpoint =
                QueryHelpers.AddQueryString(
                    "p3/customerDashboardDropdown",
                    queryParams);

            return await GetStringAsync(endpoint);
        }

        public async Task<string> GetNotification(string queryString)
        {
            var endpoint = "p3/getNotification" + queryString;

            return await GetStringAsync(endpoint);
        }

        #endregion

        #region Layout / Notification

        public async Task<string> UpdateNotification(UpdateNotificationRequest request)
        {
            var response =
                await _httpClient.PutAsJsonAsync(
                    "p3/updateNotification",
                    request,
                    _jsonOptions);

            var data =
                await response.Content.ReadAsStringAsync();

            response.EnsureSuccessStatusCode();

            return data;
        }

        public async Task<string> DeleteNotification(DeleteNotificationRequest request)
        {
            var response =
                await _httpClient.PutAsJsonAsync(
                    "p3/deleteNotification",
                    request,
                    _jsonOptions);

            var data =
                await response.Content.ReadAsStringAsync();

            response.EnsureSuccessStatusCode();

            return data;
        }

        #endregion

        public async Task<string> GetPersonalWithRole(
            int page,
            int pageSize,
            string search,
            string depart_code,
            string branch_no,
            string abbreviation)
        {
            var queryParams =
                new Dictionary<string, string?>
                {
                    ["page"] = page.ToString(),
                    ["pageSize"] = pageSize.ToString(),
                    ["search"] = search,
                    ["depart_code"] = depart_code,
                    ["branch_no"] = branch_no,
                    ["abbreviation"] = abbreviation
                };

            var endpoint =
                QueryHelpers.AddQueryString(
                    "p3/getpersonalwithRole",
                    queryParams);

            return await GetStringAsync(endpoint);
        }

        public async Task<string> GetCRMRoles()
        {
            return await GetStringAsync(
                "p3/getCRMRoles");
        }

        public async Task<string> GetPageSidebar()
        {
            return await GetStringAsync(
                "p3/getPageSidebar");
        }

        public async Task<string> GetFunc()
        {
            return await GetStringAsync(
                "p3/getFunc");
        }

        public async Task<(bool Success, int StatusCode, string Response)> PostCRMPersonalRole(PostCRMPersonalRoleRequest request)
        {
            try
            {
                var response = await PostAsync("p3/postCRMPersonalRole", request);

                var content = await response.Content.ReadAsStringAsync();

                return (
                    response.IsSuccessStatusCode,
                    (int)response.StatusCode,
                    content);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error posting CRMPersonalRole");

                throw;
            }
        }

        public async Task<(bool Success, int StatusCode, string Response)> PostPageRole(PostPageRoleRequest request)
        {
            try
            {
                var response = await PostAsync(
                    "p3/postPageRole",
                    request);

                var content =
                    await response.Content.ReadAsStringAsync();

                return (
                    response.IsSuccessStatusCode,
                    (int)response.StatusCode,
                    content);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error posting PageRole");

                throw;
            }
        }

        public async Task<(bool Success, int StatusCode, string Response)> PostCRMRole(PostCRMRoleRequest request)
        {
            try
            {
                var response = await PostAsync(
                    "p3/postCRMRole",
                    request);

                var content =
                    await response.Content.ReadAsStringAsync();

                return (
                    response.IsSuccessStatusCode,
                    (int)response.StatusCode,
                    content);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error posting CRMRole");

                throw;
            }
        }

        public async Task<(bool Success, int StatusCode, string Response)> DeleteCRMRole(DeleteCRMRoleRequest request)
        {
            try
            {
                var response = await PostAsync(
                    "p3/deleteCRMRole",
            request);

                var content =
                    await response.Content.ReadAsStringAsync();

                return (
                    response.IsSuccessStatusCode,
                    (int)response.StatusCode,
                    content);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error deleting CRMRole");

                throw;
            }
        }

        public async Task<(bool Success, int StatusCode, string Response)> DeleteCRMPersonalRole(DeleteCRMPersonalRoleRequest request)
        {
            try
            {
                var response = await PostAsync(
                    "p3/deleteCRMPersonalRole",
                    request);

                var content =
                    await response.Content.ReadAsStringAsync();

                return (
                    response.IsSuccessStatusCode,
                    (int)response.StatusCode,
                    content);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error deleting CRMPersonalRole");

                throw;
            }
        }

        public async Task<(bool Success, int StatusCode, string Response)> UpdateStatusPersonalRole(UpdateStatusPersonalRoleRequest request)
        {
            try
            {
                var response = await PutAsync(
                    "p3/updateStatusPersonalRole",
                    request);

                var content =
                    await response.Content.ReadAsStringAsync();

                return (
                    response.IsSuccessStatusCode,
                    (int)response.StatusCode,
                    content);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error updating StatusPersonalRole");

                throw;
            }
        }

        public async Task<(bool Success, int StatusCode, string Response)> UpdateCRMRole(UpdateCRMRoleRequest request)
        {
            try
            {
                var response = await PutAsync(
                    "p3/updateCRMRole",
                    request);

                var content =
                    await response.Content.ReadAsStringAsync();

                return (
                    response.IsSuccessStatusCode,
                    (int)response.StatusCode,
                    content);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error updating CRMRole");

                throw;
            }
        }

        public async Task<(bool Success, int StatusCode, string Response)> UpsertRoleFunc(UpsertRoleFuncRequest request)
        {
            try
            {
                var response = await PostAsync(
                    "p3/UpsertRoleFunc",
                    request);

                var content =
                    await response.Content.ReadAsStringAsync();

                return (
                    response.IsSuccessStatusCode,
                    (int)response.StatusCode,
                    content);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error upserting RoleFunc");

                throw;
            }
        }

        public async Task<(bool Success, int StatusCode, string Response)> UpdateVariableFunc(UpdateVariableFuncRequest request)
        {
            try
            {
                var response = await PutAsync(
                    "p3/updateVariableFunc",
                    request);

                var content =
                    await response.Content.ReadAsStringAsync();

                return (
                    response.IsSuccessStatusCode,
                    (int)response.StatusCode,
                    content);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error updating VariableFunc");

                throw;
            }
        }

        public async Task<GetProspectCustomerViewResponse> GetProspectCustomerView(string productBatch)
        {
            try
            {
                return await GetAsync<GetProspectCustomerViewResponse>(
                           $"p2/getProspectCustomerView/{Uri.EscapeDataString(productBatch)}")
                       ?? new GetProspectCustomerViewResponse();
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error loading ProspectCustomerView for ProductBatch: {ProductBatch}",
                    productBatch);

                throw;
            }
        }

        public async Task<HttpResponseMessage> UpdateProspectCustomer(UpdateProspectCustomerRequest request)
        {
            try
            {
                return await PutAsync(
                    "p3/updateProspectCustomer",
                    request);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error updating ProspectCustomer");

                throw;
            }
        }

        public async Task<string> GetStaffList(string branchId)
        {
            try
            {
                return await GetStringAsync(
                    $"p2/getStaffList/{Uri.EscapeDataString(branchId)}");
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error loading StaffList for BranchId: {BranchId}",
                    branchId);

                throw;
            }
        }

        public async Task<string> GetProspectCallDropDown()
        {
            try
            {
                var endpoint =
                    QueryHelpers.AddQueryString(
                        "p3/getMasterDropdown",
                        new Dictionary<string, string?>
                        {
                            ["pageTitle"] = "ขายและติดตาม"
                        });

                return await GetStringAsync(endpoint);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error loading ProspectCall dropdown");

                throw;
            }
        }

        public async Task<string> PostHistoryCall(JsonElement body)
        {
            try
            {
                var response = await PostAsync(
                    "p2/postHistoryCall",
                    body);

                var data =
                    await response.Content.ReadAsStringAsync();

                response.EnsureSuccessStatusCode();

                return data;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error posting HistoryCall");

                throw;
            }
        }

        public async Task<string> GetHistoryCall(string prospectBatch, string customerId)
        {
            try
            {
                var endpoint =
                    $"p2/getHistoryCall/" +
                    $"{Uri.EscapeDataString(prospectBatch)}/" +
                    $"{Uri.EscapeDataString(customerId)}";

                return await GetStringAsync(endpoint);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error loading HistoryCall. ProspectBatch: {ProspectBatch}, CustomerId: {CustomerId}",
                    prospectBatch,
                    customerId);

                throw;
            }
        }

        public async Task<CampainPagedResult> GetProductsPhase3(
            string page,
            string pageSize)
        {
            try
            {
                var data =
                    await GetStringAsync(
                        $"p2/getProductsPhase3/" +
                        $"{Uri.EscapeDataString(page)}/" +
                        $"{Uri.EscapeDataString(pageSize)}");

                return JsonSerializer.Deserialize<CampainPagedResult>(
                           data,
                           _jsonOptions)
                       ?? new CampainPagedResult();
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error loading ProductsPhase3");

                throw;
            }
        }

        public async Task<string> GetProductBatch(
            string productCode)
        {
            try
            {
                return await GetStringAsync(
                    $"p2/getProductBatch/" +
                    $"{Uri.EscapeDataString(productCode)}/-/-");
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error loading ProductBatch for ProductCode: {ProductCode}",
                    productCode);

                throw;
            }
        }

        public async Task<string> GetProspectPhase3(
            GetProspectRequest request,
            string search,
            string batch,
            string branch
            )
        {
            try
            {
                var queryParams =
                    new Dictionary<string, string?>
                    {
                        ["isNotAssign"] = "true",
                        ["search"] = search ?? "",
                        ["branch"] = branch ?? ""
                    };

                if (!string.IsNullOrWhiteSpace(batch))
                {
                    queryParams["batch"] = batch;
                }

                if (request != null)
                {
                    var properties =
                        typeof(GetProspectRequest).GetProperties();

                    foreach (var prop in properties)
                    {
                        var value =
                            prop.GetValue(request)?.ToString();

                        if (!string.IsNullOrWhiteSpace(value))
                        {
                            queryParams[prop.Name] = value;
                        }
                    }
                }

                var endpoint =
                    QueryHelpers.AddQueryString(
                        "p2/getProspect_phase3",
                        queryParams);

                return await GetStringAsync(endpoint);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error loading Prospect Phase3");

                throw;
            }
        }

        public async Task<string> GetProductFilterByGuid(
            string guid,
            string company)
        {
            try
            {
                return await GetStringAsync(
                    $"p2/getProductFilterByGuid/" +
                    $"{Uri.EscapeDataString(guid)}/" +
                    $"{Uri.EscapeDataString(company)}");
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error loading ProductFilterByGuid. Guid: {Guid}, Company: {Company}",
                    guid,
                    company);

                throw;
            }
        }

        public async Task<HttpResponseMessage> PostNewProspectBatch(
            PostNewProspectBatchRequest request)
        {
            try
            {
                return await PostAsync(
                    "p3/postNewProspectBatch",
                    request);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error posting NewProspectBatch");

                throw;
            }
        }

        public async Task<string> GetProductBatchByProductCode(
            string productCode,
            string assignTo)
        {
            try
            {
                var queryParams =
                    new Dictionary<string, string?>
                    {
                        ["product_code"] = productCode
                    };

                if (!string.IsNullOrEmpty(assignTo))
                {
                    queryParams["assign_to"] = assignTo;
                }

                var endpoint =
                    QueryHelpers.AddQueryString(
                        "p3/getProductBatchByProductCode",
                        queryParams);

                return await GetStringAsync(endpoint);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error loading ProductBatchByProductCode. ProductCode: {ProductCode}, AssignTo: {AssignTo}",
                    productCode,
                    assignTo);

                throw;
            }
        }

        public async Task<HttpResponseMessage> UpdateProductBatchStatus(
            UpdateProductBatchStatusRequest request)
        {
            try
            {
                return await PutAsync(
                    "p3/updateProductBatchStatus",
                    request);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error updating ProductBatchStatus");

                throw;
            }
        }

        public async Task<string> GetFilterDropdown(
            string  fname,
            string  fcompany
        )
        {
            try
            {
                // fname / fcompany รองรับหลายค่าคั่นด้วย comma
                // เช่น fname = "a,b,c", fcompany = "com1,com2"
                var url =
                    QueryHelpers.AddQueryString(
                        "p3/getFilterDropdown",
                        new Dictionary<string, string?>
                        {
                            ["fname"] = fname ?? "",
                            ["fcompany"] = fcompany ?? ""
                        });

                return await GetStringAsync(url);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error loading FilterDropdown");

                throw;
            }
        }

        public async Task<string> GetCampaignDataForETL(
            string? productCode, string? assignTo)
        {
            try
            {
                var endpoint =
                    QueryHelpers.AddQueryString(
                        "p3/getCampaignDataForETL",
                        new Dictionary<string, string?>
                        {
                            ["product_code"] = productCode,
                            ["assignTo"] = assignTo
                        });

                return await GetStringAsync(endpoint);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error loading CampaignDataForETL. ProductCode: {ProductCode}",
                    productCode);

                throw;
            }
        }

        public async Task<HttpResponseMessage> UpsertProspectFromETL(
            UpsertProspectFromETLRequest request)
        {
            try
            {
                return await PostAsync(
                    "p3/upsertProspectFromETL",
                    request);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error upserting ProspectFromETL");

                throw;
            }
        }

        public async Task<List<ResponseSuggestion>> GetSuggestionList(
            string personalId, 
            string? status = null, 
            string? header = null, 
            string? search = null,
            string? userEmail = null,
            string? groupEmail = null
            )
        {
            try
            {
                var pId =
                    string.IsNullOrWhiteSpace(personalId)
                        ? "0"
                        : personalId.Trim();

                var queryParams =
                    new Dictionary<string, string?>();

                if (!string.IsNullOrWhiteSpace(status))
                {
                    queryParams["status"] =
                        status.Trim();
                }

                if (!string.IsNullOrWhiteSpace(header))
                {
                    queryParams["header"] =
                        header.Trim();
                }

                if (!string.IsNullOrWhiteSpace(search))
                {
                    queryParams["search"] =
                        search.Trim();
                }

                if (!string.IsNullOrWhiteSpace(userEmail))
                {
                    queryParams["userEmail"] = userEmail.Trim();
                }

                if (!string.IsNullOrWhiteSpace(groupEmail))
                {
                    queryParams["groupEmail"] = groupEmail.Trim();
                }

                var endpoint =
                    QueryHelpers.AddQueryString(
                        $"suggestions/0/{Uri.EscapeDataString(pId)}",
                        queryParams);

                var data =
                    await GetStringAsync(endpoint);

                var list =
                    JsonSerializer.Deserialize<
                        List<ResponseSuggestion>>(
                            data,
                            _jsonOptions)
                    ?? new List<ResponseSuggestion>();

                if (!string.IsNullOrWhiteSpace(status))
                {
                    var filterStatus =
                        status.Trim();

                    list = list
                        .Where(x =>
                            string.Equals(
                                x.StatusTask?.Trim(),
                                filterStatus,
                                StringComparison
                                    .OrdinalIgnoreCase))
                        .ToList();
                }

                if (!string.IsNullOrWhiteSpace(header))
                {
                    var filterHeader =
                        header.Trim();

                    list = list
                        .Where(x =>
                            string.Equals(
                                x.SuggestionTitle?.Trim(),
                                filterHeader,
                                StringComparison
                                    .OrdinalIgnoreCase)
                            ||
                            string.Equals(
                                x.DepartCde?.Trim(),
                                filterHeader,
                                StringComparison
                                    .OrdinalIgnoreCase))
                        .ToList();
                }

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var s = search.Trim();

                    list = list
                        .Where(x =>
                            (x.SuggestionTitle != null &&
                             x.SuggestionTitle.Contains(
                                 s,
                                 StringComparison
                                     .OrdinalIgnoreCase))
                            ||
                            (x.NameProvider != null &&
                             x.NameProvider.Contains(
                                 s,
                                 StringComparison
                                     .OrdinalIgnoreCase))
                            ||
                            (x.PersonalName != null &&
                             x.PersonalName.Contains(
                                 s,
                                 StringComparison
                                     .OrdinalIgnoreCase))
                            ||
                            (x.StatusTask != null &&
                             x.StatusTask.Contains(
                                 s,
                                 StringComparison
                                     .OrdinalIgnoreCase))
                            ||
                            (x.Suggestion != null &&
                             x.Suggestion.Contains(
                                 s,
                                 StringComparison
                                     .OrdinalIgnoreCase))
                            ||
                            (x.PhoneProvider != null &&
                             x.PhoneProvider.Contains(
                                 s,
                                 StringComparison
                                     .OrdinalIgnoreCase))
                            ||
                            (x.EmailProvider != null &&
                             x.EmailProvider.Contains(
                                 s,
                                 StringComparison
                                     .OrdinalIgnoreCase)))
                        .ToList();
                }

                list = list
                    .OrderByDescending(x =>
                    {
                        DateTime? dt =
                            (x.CreatedDate.HasValue &&
                             x.CreatedDate.Value.Year > 1900)
                                ? x.CreatedDate
                                : null;

                        if (!dt.HasValue &&
                            x.DateSugges.HasValue &&
                            x.DateSugges.Value.Year > 1900)
                        {
                            dt =
                                x.TimeSugges.HasValue &&
                                x.TimeSugges.Value.Year > 1900
                                    ? x.DateSugges.Value.Date.Add(
                                        x.TimeSugges.Value.TimeOfDay)
                                    : x.DateSugges.Value;
                        }

                        if (!dt.HasValue &&
                            x.UpDate.HasValue &&
                            x.UpDate.Value.Year > 1900)
                        {
                            dt = x.UpDate;
                        }

                        return dt ?? DateTime.MinValue;
                    })
                    .ToList();

                return list;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error loading SuggestionList for PersonalId: {PersonalId}",
                    personalId);

                throw;
            }
        }

        public async Task<(bool Success, int StatusCode, string Response)> AddRequestSuggestions(RequestSuggestionsModel request)
        {
            try
            {
                var response =
                    await PostAsync(
                        "suggestionDetail",
                        request);

                var data =
                    await response.Content.ReadAsStringAsync();

                return (
                    response.IsSuccessStatusCode,
                    (int)response.StatusCode,
                    data);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error adding RequestSuggestion");

                throw;
            }
        }

        public async Task<(bool Success, int StatusCode, string Response)> UpdateSuggestion(string guid, string reply, string updBy)
        {
            try
            {
                var request = new
                {
                    guid,
                    reply,
                    updBy
                };

                var response =
                    await PostAsync(
                        "suggestionDetail",
                        request);

                var data =
                    await response.Content.ReadAsStringAsync();

                return (
                    response.IsSuccessStatusCode,
                    (int)response.StatusCode,
                    data);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error updating Suggestion. Guid: {Guid}",
                    guid);

                throw;
            }
        }

        public async Task<(bool Success, int StatusCode, string Response)> UpdateSuggestionStatusInternal(string guid, string? statusTask, string? sendTo)
        {
            try
            {
                var request = new
                {
                    guid,
                    statusTask,
                    sendTo
                };

                var response =
                    await PutAsync(
                        "p3/updateSuggestion",
                        request);

                var data =
                    await response.Content.ReadAsStringAsync();

                return (
                    response.IsSuccessStatusCode,
                    (int)response.StatusCode,
                    data);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error updating Suggestion status. Guid: {Guid}",
                    guid);

                throw;
            }
        }

        public async Task<(bool Success, int StatusCode, string Response)> PostSuggestion(RequestPostSuggestion request)
        {
            try
            {
                var response =
                    await PostAsync(
                        "suggestion",
                        request);

                var data =
                    await response.Content.ReadAsStringAsync();

                return (
                    response.IsSuccessStatusCode,
                    (int)response.StatusCode,
                    data);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error posting Suggestion");

                throw;
            }
        }

        public async Task<(bool Success, int StatusCode, string Response)> PutSuggestionStatusUpd(string guid)
        {
            try
            {
                var response =
                    await _httpClient.PutAsync(
                        $"suggestionStatusUpd/{Uri.EscapeDataString(guid)}",
                        null);

                var data =
                    await response.Content.ReadAsStringAsync();

                return (
                    response.IsSuccessStatusCode,
                    (int)response.StatusCode,
                    data);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error updating SuggestionStatusUpd. Guid: {Guid}",
                    guid);

                throw;
            }
        }

        public async Task<(bool Success, int StatusCode, string Response)> UpdateSuggestionStatus(string guid, string? statusTask = null, string? sendTo = null)
        {
            try
            {
                var request = new
                {
                    guid,
                    statusTask,
                    sendTo
                };

                var response =
                    await PutAsync(
                        "p3/updateSuggestion",
                        request);

                var data =
                    await response.Content.ReadAsStringAsync();

                return (
                    response.IsSuccessStatusCode,
                    (int)response.StatusCode,
                    data);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error updating SuggestionStatus. Guid: {Guid}",
                    guid);

                throw;
            }
        }

        public async Task<string> GetSuggestionHeader()
        {
            try
            {
                return await GetStringAsync(
                    "p3/getSuggestionHeader");
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error loading SuggestionHeader");

                throw;
            }
        }

        public async Task<string> GetSuggestionStatus()
        {
            try
            {
                return await GetStringAsync(
                    "p3/getSuggestionStatus");
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error loading SuggestionStatus");

                throw;
            }
        }

        public async Task<(bool Success, int StatusCode, string Response)> SendEmail(SendEmailRequest request)
        {
            try
            {
                var response =
                    await PostAsync(
                        "p3/sendEmail",
                        request);

                var data =
                    await response.Content.ReadAsStringAsync();

                return (
                    response.IsSuccessStatusCode,
                    (int)response.StatusCode,
                    data);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error sending Email");

                throw;
            }
        }

        public async Task<(bool Success, int StatusCode, string Response)> PostNotification(PostNotiRequest request)
        {
            try
            {
                var response =
                    await PostAsync(
                        "p3/postNotification",
                        request);

                var data =
                    await response.Content.ReadAsStringAsync();

                return (
                    response.IsSuccessStatusCode,
                    (int)response.StatusCode,
                    data);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error posting Notification");

                throw;
            }
        }

        public Task PostNotiToApprover(
            string title,
            string message,
            long sender)
        {
            try
            {
                var request = new
                {
                    title,
                    message,
                    sender
                };

                return PostAsync(
                    "p3/postNotiToApprover",
                    request);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error posting NotiToApprover");

                throw;
            }
        }

        public async Task<List<GroupPersonnel>> GetpersonalInGroup(
            string? groupEmail = null
            )
        {
            try
            {
                var queryParams =
                    new Dictionary<string, string?>();

                if (!string.IsNullOrWhiteSpace(groupEmail))
                {
                    queryParams["groupEmail"] = groupEmail.Trim();
                }

                var endpoint =
                    QueryHelpers.AddQueryString(
                        "p3/getpersonalInGroup",
                        queryParams);

                var data =
                    await GetStringAsync(endpoint);

                var list =
                    JsonSerializer.Deserialize<
                        List<GroupPersonnel>>(
                            data,
                            _jsonOptions)
                    ?? new List<GroupPersonnel>();

                return list;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error loading personal in group for GroupEmail: {GroupEmail}",
                    groupEmail);

                throw;
            }
        }

        public async Task<string> GetContnoByIdno(
            string idno
            )
        {
            try
            {


                var data = await GetStringAsync($"p3/getContnoByIdno?idno={idno}");

                return data;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error loading getContnoByIdno. idno:",
                    idno);

                throw;
            }
        }



    }
}