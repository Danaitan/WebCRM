using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using webCRM.Models;
using webCRM.Services;

namespace webCRM.Controllers
{
    public class SuggestionsController(
        CRMService crmService,
        ILogger<SuggestionsController> _logger) : Controller
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
            string? search = null,
            bool    isSeeAll = false
            )
        {
            string userEmail = "";
            string groupEmail = "";
            string personalId = "";

            if (!isSeeAll)
            {
                userEmail = HttpContext.Session.GetString("email") ?? "";
                groupEmail = HttpContext.Session.GetString("groupEmail") ?? "";
                personalId = HttpContext.Session.GetString("personalId") ?? "";
            }

            var suggestions =
                await crmService.GetSuggestionList(
                    personalId,
                    status,
                    header,
                    search,
                    userEmail,
                    groupEmail
                    );

            return Json(suggestions);
        }

        [HttpGet]
        public async Task<IActionResult> GetReplyContext(string guid)
        {
            if (string.IsNullOrWhiteSpace(guid))
            {
                return BadRequest(new
                {
                    status = "error",
                    message = "Suggestion guid is required."
                });
            }

            var personalId = HttpContext.Session.GetString("personalId") ?? "";
            var userEmail = HttpContext.Session.GetString("email") ?? "";
            var groupEmail = HttpContext.Session.GetString("groupEmail") ?? "";
            var funcId = HttpContext.Session.GetString("func_id") ?? "";
            var canSeeAll = funcId
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(value => value.Trim())
                .Contains("FCRM002", StringComparer.OrdinalIgnoreCase);

            var suggestions = await crmService.GetSuggestionList(
                canSeeAll ? "" : personalId,
                userEmail: canSeeAll ? null : userEmail,
                groupEmail: canSeeAll ? null : groupEmail);

            var suggestion = suggestions.FirstOrDefault(item =>
                string.Equals(item.Guid, guid, StringComparison.OrdinalIgnoreCase));

            if (suggestion == null)
            {
                return NotFound(new
                {
                    status = "error",
                    message = "ไม่พบข้อมูลข้อเสนอแนะ/ร้องเรียน หรือคุณไม่มีสิทธิ์ดูรายการนี้"
                });
            }

            return Json(new
            {
                guid = suggestion.Guid,
                sendTo = suggestion.SendTo,
                statusTask = suggestion.StatusTask,
                reply = suggestion.Reply,
                updBy = suggestion.UpdBy,
                upDate = suggestion.UpDate,
                personalName = suggestion.PersonalName,
                detail = suggestion.Detail
            });
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

                // await ActivityLogger.SendAsync(
                //     HttpContext,
                //     action: "AddRequestSuggestion",
                //     targetId: request.Guid ?? "",
                //     targetType: "SUGGESTION",
                //     message: "AddRequestSuggestion successfully",
                //     module: "AddRequestSuggestion"
                // );

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
            string reply)
        {
            try
            {
                // ใช้ตัวตนจาก session เท่านั้น ไม่รับ updBy จาก client เพื่อป้องกันการสวมสิทธิ์ผู้ตอบ
                var updBy = HttpContext.Session.GetString("email") ?? "";
                if (string.IsNullOrWhiteSpace(updBy))
                {
                    return Unauthorized(new
                    {
                        status = "error",
                        message = "ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่"
                    });
                }

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

                        // await ActivityLogger.SendAsync(
                        //     HttpContext,
                        //     action: "ReplySuggestion",
                        //     targetId: guid,
                        //     targetType: "SUGGESTION",
                        //     message: "ReplySuggestion successfully",
                        //     module: "UpdateSuggestion"
                        // );

                        return Content(
                            result.Response,
                            "application/json");
                    }
                    catch (JsonException)
                    {
                        // Response ไม่ใช่ JSON
                    }
                }

                // await ActivityLogger.SendAsync(
                //     HttpContext,
                //     action: "ReplySuggestion",
                //     targetId: guid,
                //     targetType: "SUGGESTION",
                //     message: "ReplySuggestion successfully",
                //     module: "UpdateSuggestion"
                // );

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

                // await ActivityLogger.SendAsync(
                //     HttpContext,
                //     action: "PostSuggestion",
                //     targetId: request.Guid ?? "",
                //     targetType: "SUGGESTION",
                //     message: "PostSuggestion successfully",
                //     module: "PostSuggestion"
                // );

                return Ok(new
                {
                    status = "success",
                    guid = request.Guid
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

                // await ActivityLogger.SendAsync(
                //     HttpContext,
                //     action: "PutSuggestionStatusUpd",
                //     targetId: guid,
                //     targetType: "SUGGESTION",
                //     message: "PutSuggestionStatusUpd successfully",
                //     module: "PutSuggestionStatusUpd"
                // );

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
                    _logger.LogError(
                        "UpdateSuggestionStatus failed. Guid: {Guid}, StatusTask: {StatusTask}, SendTo: {SendTo}, StatusCode: {StatusCode}, Response: {Response}",
                        guid,
                        statusTask,
                        sendTo,
                        result.StatusCode,
                        result.Response);

                    return Ok(new
                    {
                        status = "error",
                        message =
                            $"API responded with status code: {result.StatusCode}",
                        detail = result.Response
                    });
                }

                // await ActivityLogger.SendAsync(
                //     HttpContext,
                //     action: "UpdateSuggestionStatus",
                //     targetId: guid,
                //     targetType: "SUGGESTION",
                //     message : $"Update status To: {statusTask}",
                //     module: "UpdateSuggestionStatus"
                // );

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
                        new
                        {
                            status = false,
                            message = "เกิดข้อผิดพลาดในการโหลดข้อมูล: "
                                + ex.Message,
                            data = Array.Empty<object>()
                        }),
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
                        new
                        {
                            status = false,
                            message = "เกิดข้อผิดพลาดในการโหลดข้อมูล: "
                                + ex.Message,
                            data = Array.Empty<object>()
                        }),
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
    
            [HttpGet]
        public async Task<IActionResult> GetpersonalInGroup(
            string? groupEmail= null
            )
        {

            var suggestions =
                await crmService.GetpersonalInGroup(
                    groupEmail
                    );

            return Json(suggestions);
        }
    
    
    
    }
}