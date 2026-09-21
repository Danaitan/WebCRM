using Microsoft.AspNetCore.Mvc;
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

                // await ActivityLogger.SendAsync(
                //     HttpContext,
                //     action: "UpdateProspectCustomer",
                //     targetId: request.assign_to ?? "",
                //     targetType: "USER",
                //     message: "UpdateProspectCustomer successfully",
                //     module: "UpdateProspectCustomer"
                // );

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
        public async Task<IActionResult> GetStafflist(
            string branchId)
        {
            try
            {
                var data =
                    await crmService.GetStaffList(branchId);

                return Content(data, "application/json");
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
    }
}