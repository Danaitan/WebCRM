using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using webCRM.Models;
using webCRM.Services;

namespace webCRM.Controllers
{
    public class LayoutController(
        CRMService crmService) : Controller
    {
        public IActionResult Index()
        {
            return View();
        }

        [HttpPut]
        public async Task<IActionResult> UpdateNotification(
            [FromBody] UpdateNotificationRequest request)
        {
            try
            {
                var data =
                    await crmService.UpdateNotification(request);

                return Content(
                    data,
                    "application/json");
            }
            catch (Exception ex)
            {
                return Content(
                    JsonSerializer.Serialize(
                        "เกิดข้อผิดพลาดในการโหลดข้อมูล: "
                        + ex.Message),
                    "application/json");
            }
        }

        [HttpPut]
        public async Task<IActionResult> DeleteNotification(
            [FromBody] DeleteNotificationRequest request)
        {
            try
            {
                if (long.TryParse(
                    HttpContext.Session.GetString("personalId"),
                    out long pId))
                {
                    request.receiver = pId;
                }

                var data =
                    await crmService.DeleteNotification(request);

                return Content(
                    data,
                    "application/json");
            }
            catch (Exception ex)
            {
                return Content(
                    JsonSerializer.Serialize(
                        "เกิดข้อผิดพลาดในการโหลดข้อมูล: "
                        + ex.Message),
                    "application/json");
            }
        }
    }
}