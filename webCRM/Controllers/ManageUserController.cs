using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using webCRM.Models;
using webCRM.Services;

namespace webCRM.Controllers
{
    public class ManageUserController(
        CRMService crmService) : Controller
    {
        public IActionResult Index()
        {
            return View("manageUser");
        }

        [HttpGet]
        public async Task<IActionResult> GetpersonalwithRole(
            int page,
            int pageSize,
            string search,
            string depart_code,
            string branch_no,
            string abbreviation)
        {
            try
            {
                var data =
                    await crmService.GetPersonalWithRole(
                        page,
                        pageSize,
                        search,
                        depart_code,
                        branch_no,
                        abbreviation);

                return Content(
                    data,
                    "application/json");
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: "
                    + ex.Message;

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

        [HttpGet]
        public async Task<IActionResult> GetCRMRoles()
        {
            try
            {
                var data =
                    await crmService.GetCRMRoles();

                return Content(
                    data,
                    "application/json");
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: "
                    + ex.Message;

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

        [HttpGet]
        public async Task<IActionResult> GetPageSidebar()
        {
            try
            {
                var data =
                    await crmService.GetPageSidebar();

                return Content(
                    data,
                    "application/json");
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: "
                    + ex.Message;

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

        [HttpPost]
        public async Task<IActionResult> PostCRMPersonalRole(
            [FromBody] PostCRMPersonalRoleRequest request)
        {
            try
            {
                request.create_by =
                    HttpContext.Session.GetString("personalId")
                    ?? "";

                if (string.IsNullOrWhiteSpace(request.role_id) &&
                    string.IsNullOrWhiteSpace(request.personnel_code))
                {
                    return Ok(new
                    {
                        status = "error",
                        message =
                            "Receiver or ReceiverEmail is required."
                    });
                }

                var result =
                    await crmService.PostCRMPersonalRole(request);

                if (!result.Success)
                {
                    return Ok(new
                    {
                        status = "error",
                        message =
                            $"API responded with status code: " +
                            $"{result.StatusCode}",
                        detail = result.Response
                    });
                }

                await ActivityLogger.SendAsync(
                    HttpContext,
                    action: "PostCRMPersonalRole",
                    targetId: request.role_id ?? "",
                    targetType: "ROLE",
                    message: "PostCRMPersonalRole successfully",
                    module: "PostCRMPersonalRole"
                );

                return Ok(new
                {
                    status = "success"
                });
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    status = "error",
                    message = ex.Message
                });
            }
        }

        [HttpPost]
        public async Task<IActionResult> PostPageRole(
            [FromBody] PostPageRoleRequest request)
        {
            try
            {
                request.CreatedBy =
                    HttpContext.Session.GetString("personalId")
                    ?? "";

                if (string.IsNullOrWhiteSpace(request.RoleId) ||
                    string.IsNullOrWhiteSpace(request.PageId))
                {
                    return Ok(new
                    {
                        status = "error",
                        message =
                            "RoleId and PageId are required."
                    });
                }

                var result =
                    await crmService.PostPageRole(request);

                if (!result.Success)
                {
                    return Ok(new
                    {
                        status = "error",
                        message =
                            $"API responded with status code: " +
                            $"{result.StatusCode}",
                        detail = result.Response
                    });
                }

                await ActivityLogger.SendAsync(
                    HttpContext,
                    action: "postPageRole",
                    targetId: request.RoleId ?? "",
                    targetType: "ROLE",
                    message: "postPageRole successfully",
                    module: "postPageRole"
                );

                return Ok(new
                {
                    status = "success"
                });
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    status = "error",
                    message = ex.Message
                });
            }
        }

        [HttpPost]
        public async Task<IActionResult> PostCRMRole(
            [FromBody] PostCRMRoleRequest request)
        {
            try
            {
                request.create_by =
                    HttpContext.Session.GetString("personalId")
                    ?? "";

                if (string.IsNullOrWhiteSpace(request.role_name))
                {
                    return Ok(new
                    {
                        status = "error",
                        message = "Role name is required."
                    });
                }

                var result =
                    await crmService.PostCRMRole(request);

                if (!result.Success)
                {
                    return Ok(new
                    {
                        status = "error",
                        message =
                            $"API responded with status code: " +
                            $"{result.StatusCode}",
                        detail = result.Response
                    });
                }

                await ActivityLogger.SendAsync(
                    HttpContext,
                    action: "postCRMRole",
                    targetId: "",
                    targetType: "ROLE",
                    message: "postCRMRole successfully",
                    module: "postCRMRole"
                );

                return Ok(new
                {
                    status = "success"
                });
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    status = "error",
                    message = ex.Message
                });
            }
        }

        [HttpDelete]
        public async Task<IActionResult> DeleteCRMRole(
            [FromBody] DeleteCRMRoleRequest request)
        {
            try
            {
                request.update_by =
                    HttpContext.Session.GetString("personalId")
                    ?? "";

                if (string.IsNullOrWhiteSpace(request.role_id))
                {
                    return Ok(new
                    {
                        status = "error",
                        message = "Role ID is required."
                    });
                }

                var result =
                    await crmService.DeleteCRMRole(request);

                if (!result.Success)
                {
                    return Ok(new
                    {
                        status = "error",
                        message =
                            $"API responded with status code: " +
                            $"{result.StatusCode}",
                        detail = result.Response
                    });
                }

                await ActivityLogger.SendAsync(
                    HttpContext,
                    action: "deleteCRMRole",
                    targetId: request.role_id ?? "",
                    targetType: "ROLE",
                    message: "deleteCRMRole successfully",
                    module: "deleteCRMRole"
                );

                return Ok(new
                {
                    status = "success"
                });
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    status = "error",
                    message = ex.Message
                });
            }
        }

        [HttpDelete]
        public async Task<IActionResult> DeleteCRMPersonalRole(
            [FromBody] DeleteCRMPersonalRoleRequest request)
        {
            try
            {
                request.update_by =
                    HttpContext.Session.GetString("personalId")
                    ?? "";

                if (string.IsNullOrWhiteSpace(
                        request.personnel_code) ||
                    string.IsNullOrWhiteSpace(
                        request.role_id))
                {
                    return Ok(new
                    {
                        status = "error",
                        message =
                            "personnel_code and role_id are required."
                    });
                }

                var result =
                    await crmService
                        .DeleteCRMPersonalRole(request);

                if (!result.Success)
                {
                    return Ok(new
                    {
                        status = "error",
                        message =
                            $"API responded with status code: " +
                            $"{result.StatusCode}",
                        detail = result.Response
                    });
                }

                await ActivityLogger.SendAsync(
                    HttpContext,
                    action: "deleteCRMPersonalRole",
                    targetId: request.role_id ?? "",
                    targetType: "ROLE",
                    message: "deleteCRMPersonalRole successfully",
                    module: "deleteCRMPersonalRole"
                );

                return Ok(new
                {
                    status = "success"
                });
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    status = "error",
                    message = ex.Message
                });
            }
        }

        [HttpPut]
        public async Task<IActionResult> UpdateStatusPersonalRole(
            [FromBody] UpdateStatusPersonalRoleRequest request)
        {
            try
            {
                request.status = "unable";

                request.user =
                    HttpContext.Session.GetString("personalId")
                    ?? "";

                var result =
                    await crmService
                        .UpdateStatusPersonalRole(request);

                if (!result.Success)
                {
                    return Ok(new
                    {
                        status = "error",
                        message =
                            $"API responded with status code: " +
                            $"{result.StatusCode}",
                        detail = result.Response
                    });
                }

                await ActivityLogger.SendAsync(
                    HttpContext,
                    action: "updateStatusPersonalRole",
                    targetId: request.user ?? "",
                    targetType: "USER",
                    message : "updateStatusPersonalRole successfully",
                    module: "updateStatusPersonalRole"
                );

                return Ok(new
                {
                    status = "success",
                    data = result.Response
                });
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    status = "error",
                    message = ex.Message
                });
            }
        }

        [HttpPut]
        public async Task<IActionResult> UpdateCRMRole(
            [FromBody] UpdateCRMRoleRequest request)
        {
            try
            {
                request.user =
                    HttpContext.Session.GetString("personalId")
                    ?? "";

                var result =
                    await crmService.UpdateCRMRole(request);

                if (!result.Success)
                {
                    return Ok(new
                    {
                        status = "error",
                        message =
                            $"API responded with status code: " +
                            $"{result.StatusCode}",
                        detail = result.Response
                    });
                }

                await ActivityLogger.SendAsync(
                    HttpContext,
                    action: "UpdateCRMRole",
                    targetId: request.user ?? "",
                    targetType: "USER",
                    message : "updateCRMRole successfully",
                    module: "updateCRMRole"
                );

                return Ok(new
                {
                    status = "success",
                    data = result.Response
                });
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    status = "error",
                    message = ex.Message
                });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetFunc()
        {
            try
            {
                var data =
                    await crmService.GetFunc();

                return Content(
                    data,
                    "application/json");
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: "
                    + ex.Message;

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

        [HttpPost]
        public async Task<IActionResult> UpsertRoleFunc(
            [FromBody] UpsertRoleFuncRequest request)
        {
            try
            {
                request.user =
                    HttpContext.Session.GetString("personalId")
                    ?? "";

                if (string.IsNullOrWhiteSpace(request.role_id))
                {
                    return Ok(new
                    {
                        status = "error",
                        message = "Role id is required."
                    });
                }

                if (string.IsNullOrWhiteSpace(request.func_id))
                {
                    return Ok(new
                    {
                        status = "error",
                        message = "Function id is required."
                    });
                }

                var result =
                    await crmService.UpsertRoleFunc(request);

                if (!result.Success)
                {
                    return Ok(new
                    {
                        status = "error",
                        message =
                            $"API responded with status code: " +
                            $"{result.StatusCode}",
                        detail = result.Response
                    });
                }

                await ActivityLogger.SendAsync(
                    HttpContext,
                    action: "UpsertRoleFunc",
                    targetId: request.user ?? "",
                    targetType: "USER",
                    message: "UpsertRoleFunc successfully",
                    module: "UpsertRoleFunc"
                );

                return Ok(new
                {
                    status = "success"
                });
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    status = "error",
                    message = ex.Message
                });
            }
        }

        [HttpPut]
        public async Task<IActionResult> UpdateVariableFunc(
            [FromBody] UpdateVariableFuncRequest request)
        {
            try
            {
                request.user =
                    HttpContext.Session.GetString("personalId")
                    ?? "";

                var result =
                    await crmService.UpdateVariableFunc(request);

                if (!result.Success)
                {
                    return Ok(new
                    {
                        status = "error",
                        message =
                            $"API responded with status code: " +
                            $"{result.StatusCode}",
                        detail = result.Response
                    });
                }

                await ActivityLogger.SendAsync(
                    HttpContext,
                    action: "UpdateVariableFunc",
                    targetId: request.user ?? "",
                    targetType: "USER",
                    message : "UpdateVariableFunc successfully",
                    module: "UpdateVariableFunc"
                );

                return Ok(new
                {
                    status = "success",
                    data = result.Response
                });
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    status = "error",
                    message = ex.Message
                });
            }
        }

        [HttpGet]
        public async Task<List<Branch>> getBranchListForCRM()
        {
            try
            {
                return await crmService.GetBranchListForCRM();
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;

                return new List<Branch>();
            }
        }

    }
}