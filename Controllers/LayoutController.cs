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

        public class SwitchRoleRequest
        {
            public string? role_id { get; set; }
            public string? role_name { get; set; }
        }

        [HttpPost]
        public async Task<IActionResult> SwitchRole(
            [FromBody] SwitchRoleRequest request)
        {
            try
            {
                if (request == null
                    || string.IsNullOrWhiteSpace(request.role_id))
                {
                    return Content(
                        JsonSerializer.Serialize(new
                        {
                            status = false,
                            message = "กรุณาระบุบทบาทที่ต้องการเปลี่ยน"
                        }),
                        "application/json");
                }

                string roleId = request.role_id.Trim();
                string roleName =
                    (request.role_name ?? "").Trim();

                // ===== Persist the role change to the database =====
                // เหมือนกับหน้า ManageUser: ถอดบทบาทเดิมออก แล้วเพิ่ม
                // บทบาทใหม่ เพื่อให้ตอน re-login ระบบดึง profile จาก DB
                // ได้บทบาทใหม่จริง ไม่ใช่แค่ค้างไว้ใน session
                string personnelCode =
                    HttpContext.Session.GetString("personalId") ?? "";
                string previousRoleId =
                    HttpContext.Session.GetString("roleId") ?? "";

                if (!string.IsNullOrWhiteSpace(personnelCode))
                {
                    // 1) ถอดบทบาทเดิมออก (ถ้ามีและไม่ใช่ตัวเดียวกับที่เลือก)
                    if (!string.IsNullOrWhiteSpace(previousRoleId)
                        && previousRoleId != roleId)
                    {
                        var unableResult =
                            await crmService.PostCRMPersonalRole(
                                new PostCRMPersonalRoleRequest
                                {
                                    personnel_code = personnelCode,
                                    role_id = previousRoleId,
                                    create_by = personnelCode,
                                    status = "unable"
                                });

                        if (!unableResult.Success)
                        {
                            return Content(
                                JsonSerializer.Serialize(new
                                {
                                    status = false,
                                    message =
                                        "ไม่สามารถถอดบทบาทเดิมได้ "
                                        + $"(HTTP {unableResult.StatusCode})"
                                }),
                                "application/json");
                        }
                    }

                    // 2) เพิ่มบทบาทใหม่ (enable)
                    var enableResult =
                        await crmService.PostCRMPersonalRole(
                            new PostCRMPersonalRoleRequest
                            {
                                personnel_code = personnelCode,
                                role_id = roleId,
                                create_by = personnelCode,
                                status = "enable"
                            });

                    if (!enableResult.Success)
                    {
                        return Content(
                            JsonSerializer.Serialize(new
                            {
                                status = false,
                                message =
                                    "ไม่สามารถกำหนดบทบาทใหม่ได้ "
                                    + $"(HTTP {enableResult.StatusCode})"
                            }),
                            "application/json");
                    }
                }

                HttpContext.Session.SetString(
                    "roleId",
                    roleId);

                HttpContext.Session.SetString(
                    "roleName",
                    roleName);

                // Mark this role as manually switched so that a
                // subsequent re-login preserves it instead of falling
                // back to the personnel's default role from the profile.
                HttpContext.Session.SetString(
                    "switchedRoleId",
                    roleId);

                HttpContext.Session.SetString(
                    "switchedRoleName",
                    roleName);

                // Rebuild welcome text to reflect the new role.
                string personalId =
                    HttpContext.Session.GetString("personalId") ?? "";
                string fullNameTh =
                    HttpContext.Session.GetString("fullNameTh") ?? "";

                HttpContext.Session.SetString(
                    "profile_welcome",
                    $"[{personalId}] ({fullNameTh}) [{roleName}]");

                return Content(
                    JsonSerializer.Serialize(new
                    {
                        status = true,
                        message = "เปลี่ยนบทบาทเรียบร้อยแล้ว",
                        role_id = roleId,
                        role_name = roleName
                    }),
                    "application/json");
            }
            catch (Exception ex)
            {
                return Content(
                    JsonSerializer.Serialize(new
                    {
                        status = false,
                        message = "เกิดข้อผิดพลาดในการเปลี่ยนบทบาท: "
                            + ex.Message
                    }),
                    "application/json");
            }
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