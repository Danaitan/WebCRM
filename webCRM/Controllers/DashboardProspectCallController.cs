using Microsoft.AspNetCore.Mvc;
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

        public async Task<IActionResult> GetCallDashboard(
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
                var data = await crmService.GetCallDashboard(
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