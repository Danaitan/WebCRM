using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using webCRM.Models;
using webCRM.Services;

namespace webCRM.Controllers
{
    public class SuggestionsController(
        CRMService crmService) : Controller
    {
        public async Task<IActionResult> Index()
        {
            var personalId =
                HttpContext.Session.GetString("personalId")
                ?? "";

            var suggestions =
                await crmService.GetSuggestionList(
                    personalId);

            return View(
                "suggestions",
                suggestions);
        }

        [HttpGet]
        public async Task<IActionResult> GetSuggestions(
            string? status = null,
            string? header = null,
            string? search = null)
        {
            var personalId =
                HttpContext.Session.GetString("personalId")
                ?? "";

            var suggestions =
                await crmService.GetSuggestionList(
                    personalId,
                    status,
                    header,
                    search);

            return Json(suggestions);
        }

        [HttpPost]
        public async Task<IActionResult> AddRequestSuggestions(
            [FromBody] RequestSuggestionsModel request)
        {
            try
            {
                var result =
                    await crmService.AddRequestSuggestions(
                        request);

                if (!result.Success)
                {
                    return Ok(new
                    {
                        status = "error",
                        message =
                            $"API responded with status code: {result.StatusCode}",
                        detail = result.Response
                    });
                }

                await ActivityLogger.SendAsync(
                    HttpContext,
                    action: "AddRequestSuggestion",
                    targetId: request.Guid ?? "",
                    targetType: "SUGGESTION",
                    message: "AddRequestSuggestion successfully",
                    module: "AddRequestSuggestion"
                );

                return Ok(new
                {
                    status = "success",
                    message = "ยืนยันการบันทึกข้อมูล"
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
        public async Task<IActionResult> UpdateSuggestion(
            string guid,
            string reply,
            string updBy)
        {
            try
            {
                var result =
                    await crmService.UpdateSuggestion(
                        guid,
                        reply,
                        updBy);

                if (!result.Success)
                {
                    return Ok(new
                    {
                        status = "error",
                        message =
                            $"API responded with status code: {result.StatusCode}"
                    });
                }

                // เดิม Controller เรียก UpdateSuggestionStatus
                // หลังจากยิง suggestionDetail สำเร็จ
                await crmService.UpdateSuggestionStatusInternal(
                    guid,
                    "Reply",
                    null);

                if (!string.IsNullOrWhiteSpace(result.Response))
                {
                    try
                    {
                        using var doc =
                            JsonDocument.Parse(
                                result.Response);

                        await ActivityLogger.SendAsync(
                            HttpContext,
                            action: "ReplySuggestion",
                            targetId: guid,
                            targetType: "SUGGESTION",
                            message: "ReplySuggestion successfully",
                            module: "UpdateSuggestion"
                        );

                        return Content(
                            result.Response,
                            "application/json");
                    }
                    catch (JsonException)
                    {
                        // Response ไม่ใช่ JSON
                    }
                }

                await ActivityLogger.SendAsync(
                    HttpContext,
                    action: "ReplySuggestion",
                    targetId: guid,
                    targetType: "SUGGESTION",
                    message: "ReplySuggestion successfully",
                    module: "UpdateSuggestion"
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
        public async Task<IActionResult> PostSuggestion(
            [FromBody] RequestPostSuggestion request)
        {
            try
            {
                request.Guid =
                    Guid.NewGuid().ToString();

                if (string.IsNullOrEmpty(request.Status))
                {
                    request.Status = "Pending";
                }

                if (string.IsNullOrEmpty(request.Company))
                {
                    var email =
                        HttpContext.Session.GetString("email")
                        ?? "";

                    string company = "";

                    if (email.Contains(
                        "microleasingplc",
                        StringComparison.OrdinalIgnoreCase))
                    {
                        company = "MICRO";
                    }
                    else if (email.Contains(
                        "microinsurebroker",
                        StringComparison.OrdinalIgnoreCase))
                    {
                        company = "MIB";
                    }
                    else if (email.Contains(
                        "mfin",
                        StringComparison.OrdinalIgnoreCase))
                    {
                        company = "MFIN";
                    }

                    request.Company = company;
                }

                if (string.IsNullOrEmpty(request.UpdBy))
                {
                    request.UpdBy =
                        HttpContext.Session.GetString("email")
                        ?? "";
                }

                request.UpdDate =
                    DateOnly.FromDateTime(
                        DateTime.Today);

                if (!string.IsNullOrWhiteSpace(
                    request.ccMail))
                {
                    var emails =
                        request.ccMail
                            .Split(
                                new[] { ',', ';' },
                                StringSplitOptions
                                    .RemoveEmptyEntries)
                            .Select(e => e.Trim())
                            .Where(e =>
                                !string.IsNullOrEmpty(e));

                    request.ccMail =
                        string.Join(" , ", emails);
                }

                var result =
                    await crmService.PostSuggestion(
                        request);

                if (!result.Success)
                {
                    return Ok(new
                    {
                        status = "error",
                        message =
                            $"API responded with status code: {result.StatusCode}"
                    });
                }

                await ActivityLogger.SendAsync(
                    HttpContext,
                    action: "PostSuggestion",
                    targetId: request.Guid ?? "",
                    targetType: "SUGGESTION",
                    message: "PostSuggestion successfully",
                    module: "PostSuggestion"
                );

                if (!string.IsNullOrWhiteSpace(
                    result.Response))
                {
                    try
                    {
                        using var doc =
                            JsonDocument.Parse(
                                result.Response);

                        return Content(
                            result.Response,
                            "application/json");
                    }
                    catch (JsonException)
                    {
                        // Response ไม่ใช่ JSON
                    }
                }

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
        public async Task<IActionResult> PutSuggestionStatusUpd(
            string guid)
        {
            try
            {
                var result =
                    await crmService.PutSuggestionStatusUpd(
                        guid);

                if (!result.Success)
                {
                    return Ok(new
                    {
                        status = "error",
                        message =
                            $"API responded with status code: {result.StatusCode}"
                    });
                }

                await ActivityLogger.SendAsync(
                    HttpContext,
                    action: "PutSuggestionStatusUpd",
                    targetId: guid,
                    targetType: "SUGGESTION",
                    message: "PutSuggestionStatusUpd successfully",
                    module: "PutSuggestionStatusUpd"
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
        public async Task<IActionResult> UpdateSuggestionStatus(
            string guid,
            string? statusTask = null,
            string? sendTo = null)
        {
            try
            {
                var result =
                    await crmService.UpdateSuggestionStatus(
                        guid,
                        statusTask,
                        sendTo);

                if (!result.Success)
                {
                    return Ok(new
                    {
                        status = "error",
                        message =
                            $"API responded with status code: {result.StatusCode}"
                    });
                }

                await ActivityLogger.SendAsync(
                    HttpContext,
                    action: "UpdateSuggestionStatus",
                    targetId: guid,
                    targetType: "SUGGESTION",
                    message : $"Update status To: {statusTask}",
                    module: "UpdateSuggestionStatus"
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

        [HttpGet]
        public async Task<IActionResult> GetSuggestionHeader()
        {
            try
            {
                var data =
                    await crmService.GetSuggestionHeader();

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

        [HttpGet]
        public async Task<IActionResult> GetSuggestionStatus()
        {
            try
            {
                var data =
                    await crmService.GetSuggestionStatus();

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

        [HttpPost]
        public async Task<IActionResult> SendEmail(
            [FromBody] SendEmailRequest request)
        {
            try
            {
                request.ContentType = "HTML";

                request.From =
                    HttpContext.Session.GetString("email")
                    ?? "";

                var result =
                    await crmService.SendEmail(request);

                if (!result.Success)
                {
                    return Ok(new
                    {
                        status = "error",
                        message =
                            $"API responded with status code: {result.StatusCode}"
                    });
                }

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
        public async Task<IActionResult> PostNotification(
            [FromBody] PostNotiRequest request)
        {
            try
            {
                var personalId =
                    HttpContext.Session.GetString("personalId")
                    ?? "";

                request.Sender = personalId;
                request.CreateBy = personalId;

                if (string.IsNullOrWhiteSpace(
                        request.Receiver) &&
                    string.IsNullOrWhiteSpace(
                        request.ReceiverEmail))
                {
                    return Ok(new
                    {
                        status = "error",
                        message =
                            "Receiver or ReceiverEmail is required."
                    });
                }

                var result =
                    await crmService.PostNotification(
                        request);

                if (!result.Success)
                {
                    return Ok(new
                    {
                        status = "error",
                        message =
                            $"API responded with status code: {result.StatusCode}"
                    });
                }

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
    }
}