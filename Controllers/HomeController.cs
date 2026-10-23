using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Text.Json;
using webCRM.Models;
using webCRM.Services;

namespace webCRM.Controllers
{
    public class HomeController(
        CRMService crmService) : Controller
    {
        public IActionResult Index(
            [FromQuery] string? user = null)
        {
            // มี user มาใน query -> ส่งต่อให้ Login ตั้ง cookie และล็อกอิน
            if (!string.IsNullOrWhiteSpace(user))
            {
                return RedirectToAction(
                    "Index",
                    "Login",
                    new { user });
            }

            var profileWelcome =
                HttpContext.Session.GetString("profile_welcome");

            if (!string.IsNullOrEmpty(profileWelcome))
            {
                ViewData["profile_welcome"] = profileWelcome;
            }
            else
            {
                // ยังไม่มี session (เช่น เข้าจากลิงก์ในอีเมลแบบ /Home เปล่า ๆ)
                // ส่งต่อไป Login โดยไม่ส่ง user เพื่อให้ Login ไปเช็ค cookie "userCde" แทน
                return RedirectToAction("Index", "Login");
            }

            return View();
        }

        [ResponseCache(
            Duration = 0,
            Location = ResponseCacheLocation.None,
            NoStore = true)]
        public IActionResult Error()
        {
            return View(
                new ErrorViewModel
                {
                    RequestId =
                        Activity.Current?.Id
                        ?? HttpContext.TraceIdentifier
                });
        }

        public async Task<MasterData> GetMaster()
        {
            try
            {
                return await crmService.GetMaster();
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: "
                    + ex.Message;

                return new MasterData();
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetCustommerDashboard(
            string company,
            string branch,
            string cusType,
            string gender,
            string contactStatus)
        {
            try
            {
                var data =
                    await crmService.GetCustommerDashboard(
                        company,
                        branch,
                        cusType,
                        gender,
                        contactStatus);

                return Content(
                    data,
                    "application/json");
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: "
                    + ex.Message;

                var errJson =
                    JsonSerializer.Serialize(
                        new
                        {
                            status = false,
                            message =
                                "เกิดข้อผิดพลาดในการโหลดข้อมูล: "
                                + ex.Message
                        });

                return Content(
                    errJson,
                    "application/json");
            }
        }

        [HttpGet]
        public async Task<IActionResult>
            GetCustommerDashboardDropdown(
                string company)
        {
            try
            {
                var data =
                    await crmService
                        .GetCustommerDashboardDropdown(
                            company);

                return Content(
                    data,
                    "application/json");
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: "
                    + ex.Message;

                var errJson =
                    JsonSerializer.Serialize(
                        new
                        {
                            status = false,
                            message =
                                "เกิดข้อผิดพลาดในการโหลดข้อมูล: "
                                + ex.Message
                        });

                return Content(
                    errJson,
                    "application/json");
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetNotification()
        {
            try
            {
                var queryString =
                    Request.QueryString.Value ?? "";

                var data =
                    await crmService.GetNotification(
                        queryString);

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