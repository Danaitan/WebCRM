using Microsoft.AspNetCore.Mvc;
using webCRM.Models;
using webCRM.Services;

namespace webCRM.Controllers
{
    public class DashboardProspectCallController(
        CRMService crmService) : Controller
    {
        public IActionResult Index()
        {
            return View("~/Views/Home/Dashboard/prospectCall.cshtml");
        }

        [HttpPost]
        public async Task<IActionResult> GetCallDashboard(
            [FromBody] CallDashboardRequest request
            )
        {
            try
            {
                request ??= new CallDashboardRequest();

                // รองรับทั้ง "1"/"0", "true"/"false" ที่ส่งมาใน is_creater
                string is_createrString =
                    (request.IsCreater?.Trim().ToLowerInvariant()) switch
                    {
                        "1" or "true" => "1",
                        _ => "0"
                    };

                var data = await crmService.GetCallDashboard(
                    request.Startdate,
                    request.Enddate,
                    request.CallType,
                    request.Branch,
                    request.CallBy,
                    request.CallResult,
                    request.CampaignName,
                    is_createrString
                    );

                return Content(data, "application/json");
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;

                return Content(
                    System.Text.Json.JsonSerializer.Serialize(new
                    {
                        status = false,
                        message = ex.Message,
                        data = Array.Empty<object>()
                    }),
                    "application/json");
            }
        }

        public async Task<IActionResult> GetCallResult()
        {
            try
            {
                var data = await crmService.GetCallResult();

                return Content(data, "application/json");
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;

                return Content(
                    System.Text.Json.JsonSerializer.Serialize(new
                    {
                        status = false,
                        message = ex.Message,
                        data = Array.Empty<object>()
                    }),
                    "application/json");
            }
        }

        public async Task<IActionResult> GetEmployeeList(
            string branch)
        {
            try
            {
                var data =
                    await crmService.GetEmployeeList(branch);

                return Content(data, "application/json");
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;

                return Content(
                    System.Text.Json.JsonSerializer.Serialize(new
                    {
                        status = false,
                        message = ex.Message,
                        data = Array.Empty<object>()
                    }),
                    "application/json");
            }
        }

        public async Task<IActionResult> GetCallDashboardExcel(
            string? startdate,
            string? enddate,
            string? call_type,
            string? branch,
            string? call_by,
            string? call_result,
            string? campaign_name)
        {
            try
            {
                var data =
                    await crmService.GetCallDashboardExcel(
                        startdate,
                        enddate,
                        call_type,
                        branch,
                        call_by,
                        call_result,
                        campaign_name);

                return Content(data, "application/json");
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;

                return Content(
                    System.Text.Json.JsonSerializer.Serialize(new
                    {
                        status = false,
                        message = ex.Message
                    }),
                    "application/json");
            }
        }

        public async Task<IActionResult> GetHistoryCallDashboardExcel(
            string? startdate,
            string? enddate,
            string? call_type,
            string? branch,
            string? call_by,
            string? call_result,
            string? campaign_name)
        {
            try
            {
                var data =
                    await crmService.GetHistoryCallDashboardExcel(
                        startdate,
                        enddate,
                        call_type,
                        branch,
                        call_by,
                        call_result,
                        campaign_name);

                return Content(data, "application/json");
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;

                return Content(
                    System.Text.Json.JsonSerializer.Serialize(new
                    {
                        status = false,
                        message = ex.Message
                    }),
                    "application/json");
            }
        }
    }
}