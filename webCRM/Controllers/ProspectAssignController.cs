using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using webCRM.Models;
using webCRM.Services;

namespace webCRM.Controllers
{
    public class ProspectAssignController(
        CRMService crmService) : Controller
    {
        public IActionResult Index()
        {
            return View("prospectAssign");
        }

        [HttpGet]
        public async Task<List<Branch>> GetAllowedBranchList()
        {
            try
            {
                var variableFunc =
                    HttpContext.Session.GetString("variable_func")
                    ?? "";

                var allowedBranchCodes = variableFunc
                    .Split(
                        ',',
                        StringSplitOptions.RemoveEmptyEntries
                        | StringSplitOptions.TrimEntries)
                    .Select(NormalizeBranchCode)
                    .Where(code => !string.IsNullOrEmpty(code))
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);

                if (allowedBranchCodes.Count == 0)
                {
                    return new List<Branch>();
                }

                var branches =
                    await crmService.GetBranchListForCRM();

                return branches
                    .Where(branch =>
                        allowedBranchCodes.Contains(
                            NormalizeBranchCode(branch.Offcde)))
                    .ToList();
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;

                return new List<Branch>();
            }
        }

        private static string NormalizeBranchCode(string? code)
        {
            var value = code?.Trim() ?? "";

            if (string.IsNullOrEmpty(value)
                || !value.All(char.IsDigit))
            {
                return value;
            }

            var normalized = value.TrimStart('0');
            return string.IsNullOrEmpty(normalized) ? "0" : normalized;
        }

        [HttpPut]
        public async Task<IActionResult> UpdateProspectCustomer(
            [FromBody] UpdateProspectCustomerRequest request)
        {
            try
            {
                var personalId =
                    HttpContext.Session.GetString("personalId")
                    ?? "";

                request.assigner = personalId;
                request.updated_by = personalId;

                var response =
                    await crmService.UpdateProspectCustomer(request);

                var data =
                    await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    return Content(
                        string.IsNullOrEmpty(data)
                            ? $"{{\"status\": false, \"message\": \"API return error {(int)response.StatusCode}: {response.ReasonPhrase}\", \"data\": []}}"
                            : data,
                        "application/json");
                }

                return Content(data, "application/json");
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;

                return Content(
                    System.Text.Json.JsonSerializer.Serialize(
                        new
                        {
                            status = false,
                            message = ex.Message,
                            data = Array.Empty<object>()
                        }),
                    "application/json");
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetStafflist()
        {
            try
            {
                    var single =
                        await crmService.GetStaffList();

                    return Content(single, "application/json");

            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;

                var errJson =
                    System.Text.Json.JsonSerializer.Serialize(
                        new
                        {
                            status = false,
                            message =
                                "เกิดข้อผิดพลาดในการโหลดข้อมูล: "
                                + ex.Message,
                            data = Array.Empty<object>()
                        });

                return Content(
                    errJson,
                    "application/json");
            }
        }

        // แปลง JSON ที่ได้จาก staff API ให้เป็นรายการ staff
        // พร้อมฝังรหัสสาขา (offcde) ลงในแต่ละ record เพื่อให้ฝั่ง client กรองได้
        private static IEnumerable<JsonElement> ExtractStaffElements(
            string raw,
            string branchCode)
        {
            if (string.IsNullOrWhiteSpace(raw))
            {
                yield break;
            }

            JsonDocument doc;
            try
            {
                doc = JsonDocument.Parse(raw);
            }
            catch
            {
                yield break;
            }

            using (doc)
            {
                var root = doc.RootElement;

                JsonElement array;
                if (root.ValueKind == JsonValueKind.Array)
                {
                    array = root;
                }
                else if (root.ValueKind == JsonValueKind.Object
                         && root.TryGetProperty("data", out var dataProp)
                         && dataProp.ValueKind == JsonValueKind.Array)
                {
                    array = dataProp;
                }
                else if (root.ValueKind == JsonValueKind.Object
                         && root.TryGetProperty("result", out var resultProp)
                         && resultProp.ValueKind == JsonValueKind.Array)
                {
                    array = resultProp;
                }
                else
                {
                    yield break;
                }

                foreach (var item in array.EnumerateArray())
                {
                    yield return InjectBranchCode(item, branchCode);
                }
            }
        }

        // ฝัง offcde ลงในแต่ละ staff record (ถ้ายังไม่มี)
        private static JsonElement InjectBranchCode(
            JsonElement item,
            string branchCode)
        {
            if (item.ValueKind != JsonValueKind.Object)
            {
                return item.Clone();
            }

            var dict = new Dictionary<string, JsonElement>();
            foreach (var prop in item.EnumerateObject())
            {
                dict[prop.Name] = prop.Value.Clone();
            }

            if (!dict.ContainsKey("offcde"))
            {
                using var branchDoc = JsonDocument.Parse(
                    System.Text.Json.JsonSerializer.Serialize(branchCode));
                dict["offcde"] = branchDoc.RootElement.Clone();
            }

            using var merged = JsonDocument.Parse(
                System.Text.Json.JsonSerializer.Serialize(dict));
            return merged.RootElement.Clone();
        }
    }
}