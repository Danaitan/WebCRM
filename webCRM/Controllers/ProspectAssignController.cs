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

                await ActivityLogger.SendAsync(
                    HttpContext,
                    action: "UpdateProspectCustomer",
                    targetId: request.assign_to ?? "",
                    targetType: "USER",
                    message: "UpdateProspectCustomer successfully",
                    module: "UpdateProspectCustomer"
                );

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