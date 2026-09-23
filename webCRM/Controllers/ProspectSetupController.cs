using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using webCRM.Models;
using webCRM.Services;

namespace webCRM.Controllers
{
    public class ProspectSetupController(
        CRMService crmService) : Controller
    {
        public IActionResult Index()
        {
            return View("prospectSetup");
        }

        [HttpGet]
        public async Task<IActionResult> GetBatchList(
            string productCode)
        {
            try
            {
                var data =
                    await crmService.GetProductBatch(
                        productCode);

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
                    JsonSerializer.Serialize(
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
        public async Task<IActionResult> GetProspect(
            GetProspectRequest request,
            string search = "",
            string? batch = null,
            string branch = ""
            )
        {
            try
            {
                var data =
                    await crmService.GetProspectPhase3(
                        request,
                        search,
                        batch,
                        branch
                        );

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
                    JsonSerializer.Serialize(
                        new
                        {
                            count = 0,
                            data = Array.Empty<object>()
                        }),
                    "application/json");
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetProductFilterByGuid(
            string guid)
        {
            try
            {
                var company =
                    HttpContext.Session.GetString("company")
                    ?? "";

                var data =
                    await crmService.GetProductFilterByGuid(
                        guid,
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

                return Content(
                    JsonSerializer.Serialize(
                        new
                        {
                            status = false,
                            message = ex.Message,
                            data = Array.Empty<object>()
                        }),
                    "application/json");
            }
        }

        [HttpPost]
        public async Task<IActionResult> PostNewProspectBatch(
            [FromBody] PostNewProspectBatchRequest request)
        {
            try
            {
                var personalId =
                    HttpContext.Session.GetString("personalId")
                    ?? "";

                request.created_by = personalId;

                var response =
                    await crmService.PostNewProspectBatch(
                        request);

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
                    JsonSerializer.Serialize(
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
        public async Task<IActionResult> getProductBatchByProductCode(
            string productCode,
            string assignTo)
        {
            try
            {
                var data =
                    await crmService.GetProductBatchByProductCode(
                        productCode,
                        assignTo);

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
                    JsonSerializer.Serialize(
                        new
                        {
                            status = false,
                            message = ex.Message,
                            data = Array.Empty<object>()
                        }),
                    "application/json");
            }
        }

        [HttpPut]
        public async Task<IActionResult> updateProductBatchStatus(
            [FromBody] UpdateProductBatchStatusRequest request)
        {
            try
            {
                var personalId =
                    HttpContext.Session.GetString("personalId")
                    ?? "";

                request.updated_by = personalId;

                var response =
                    await crmService.UpdateProductBatchStatus(
                        request);

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
                    JsonSerializer.Serialize(
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
        public async Task<IActionResult> getFilterDropdown(
            string company = ""
        )
        {
            try
            {
                company = HttpContext.Session.GetString("company") ?? "";
                var data =
                    await crmService.GetFilterDropdown(
                        company
                    );

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
                    JsonSerializer.Serialize(
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
        public async Task<IActionResult> getCampaignDataForETL(
            string? productCode, string? assignTo)
        {
            try
            {
                var data =
                    await crmService.GetCampaignDataForETL(
                        productCode, assignTo);

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
                    JsonSerializer.Serialize(
                        new
                        {
                            status = false,
                            message = ex.Message,
                            data = Array.Empty<object>()
                        }),
                    "application/json");
            }
        }

        [HttpPost]
        public async Task<IActionResult> upsertProspectFromETL([FromBody] UpsertProspectFromETLRequest? request)
        {
            try
            {
                if (request == null)
                {
                    return Content(
                        JsonSerializer.Serialize(
                            new
                            {
                                status = false,
                                message = "ไม่พบข้อมูล request",
                                data = Array.Empty<object>()
                            }),
                        "application/json");
                }

                var personalId =
                    HttpContext.Session.GetString("personalId")
                    ?? "";

                request.user = personalId;

                var response =
                    await crmService.UpsertProspectFromETL(request);

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

                // await ActivityLogger.SendAsync(
                //     HttpContext,
                //     action: "upsertProspectFromETL",
                //     targetId: request.productCode ?? "",
                //     targetType: "Campaign",
                //     message: "upsertProspectFromETL successfully",
                //     module: "upsertProspectFromETL"
                // );

                return Content(
                    data,
                    "application/json");
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;

                return Content(
                    JsonSerializer.Serialize(
                        new
                        {
                            status = false,
                            message = ex.Message,
                            data = Array.Empty<object>()
                        }),
                    "application/json");
            }
        }
            
        [HttpPost]
        public async Task<IActionResult> postNotiToApprover(
            [FromBody] PostNotiToApproverRequest request)
        {
            try
            {
                if (request == null)
                {
                    return Content(
                        JsonSerializer.Serialize(
                            new
                            {
                                status = false,
                                message = "ไม่พบข้อมูล request",
                                data = Array.Empty<object>()
                            }),
                        "application/json");
                }

                var personalId =
                    HttpContext.Session.GetString("personalId")
                    ?? "";

                long sender = long.TryParse(personalId, out var parsed)
                    ? parsed
                    : 0;

                await crmService.PostNotiToApprover(
                    request.title ?? "",
                    request.message ?? "",
                    sender);

                return Ok(new { status = true });
            }
            catch (Exception ex)
            {
                return Content(
                    JsonSerializer.Serialize(
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
        public async Task<IActionResult> GetContnoByIdno(
            string idno = ""
            )
        {
            try
            {
                var data =
                    await crmService.GetContnoByIdno(
                        idno
                        );

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
                    JsonSerializer.Serialize(
                        new
                        {
                            count = 0,
                            data = Array.Empty<object>()
                        }),
                    "application/json");
            }
        }
    
    }
}