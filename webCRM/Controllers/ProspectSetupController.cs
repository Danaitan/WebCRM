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
        public async Task<CampainPagedResult> GetCampainList(
            string page = "1",
            string pageSize = "20")
        {
            try
            {
                var reqPage =
                    string.IsNullOrEmpty(page)
                        ? "1"
                        : page;

                var reqPageSize =
                    string.IsNullOrEmpty(pageSize)
                        ? "20"
                        : pageSize;

                return await crmService.GetProductsPhase3(
                    reqPage,
                    reqPageSize);
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: "
                    + ex.Message;

                return new CampainPagedResult();
            }
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
            int page = 1,
            int pageSize = 10,
            string search = "")
        {
            try
            {
                var data =
                    await crmService.GetProspectPhase3(
                        request,
                        page,
                        pageSize,
                        search);

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
                            page,
                            pageSize,
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
        public async Task<IActionResult> getFilterDropdown()
        {
            try
            {
                var data =
                    await crmService.GetFilterDropdown();

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
            string? productCode)
        {
            try
            {
                var data =
                    await crmService.GetCampaignDataForETL(
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

                await ActivityLogger.SendAsync(
                    HttpContext,
                    action: "upsertProspectFromETL",
                    targetId: request.productCode ?? "",
                    targetType: "Campaign",
                    message: "upsertProspectFromETL successfully",
                    module: "upsertProspectFromETL"
                );

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
            
    
    
    }
}