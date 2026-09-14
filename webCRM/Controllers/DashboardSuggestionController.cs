using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using webCRM.Services;

namespace webCRM.Controllers
{
    public class DashboardSuggestionController(
        CRMService crmService) : Controller
    {
        public IActionResult Index()
        {
            return View("~/Views/Home/Dashboard/suggestion.cshtml");
        }

        public async Task<IActionResult> GetSuggestionDashboard(
            string? startdate,
            string? enddate,
            string? provider,
            string? branch,
            string? title,
            string? status)
        {
            try
            {
                var data = await crmService.GetSuggestionDashboard(
                    startdate,
                    enddate,
                    provider,
                    branch,
                    title,
                    status);

                return Content(data, "application/json");
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;

                return Content(
                    JsonSerializer.Serialize(new
                    {
                        status = false,
                        message = ex.Message,
                        data = Array.Empty<object>()
                    }),
                    "application/json");
            }
        }

        public async Task<IActionResult> GetPersonalAndGroup()
        {
            try
            {
                var data =
                    await crmService.GetPersonalAndGroup();

                return Content(data, "application/json");
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;

                return Content(
                    JsonSerializer.Serialize(new
                    {
                        status = false,
                        message = ex.Message,
                        group = Array.Empty<object>(),
                        personal = Array.Empty<object>(),
                        personalAbb = Array.Empty<object>()
                    }),
                    "application/json");
            }
        }

        public async Task<IActionResult> GetSuggestionDashboardExcel(
            string? startdate,
            string? enddate,
            string? provider,
            string? branch,
            string? title,
            string? status)
        {
            try
            {
                var data =
                    await crmService.GetSuggestionDashboardExcel(
                        startdate,
                        enddate,
                        provider,
                        branch,
                        title,
                        status);

                return Content(data, "application/json");
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;

                return Content(
                    JsonSerializer.Serialize(new
                    {
                        status = false,
                        message = ex.Message,
                        data = Array.Empty<object>()
                    }),
                    "application/json");
            }
        }
    }
}