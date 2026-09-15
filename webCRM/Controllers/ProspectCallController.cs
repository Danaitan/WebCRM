using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using webCRM.Services;

namespace webCRM.Controllers
{
    public class ProspectCallController(
        CRMService crmService) : Controller
    {
        public IActionResult Index()
        {
            return View("prospectCall");
        }

        [HttpGet]
        public async Task<IActionResult> GetDropDown()
        {
            try
            {
                var data =
                    await crmService.GetProspectCallDropDown();

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
        public async Task<IActionResult> postHistoryCall(
            [FromBody] JsonElement body)
        {
            try
            {
                var data =
                    await crmService.PostHistoryCall(body);

                string targetId = "";

                if (body.ValueKind == JsonValueKind.Object &&
                    body.TryGetProperty(
                        "idno",
                        out JsonElement idnoElem))
                {
                    if (idnoElem.ValueKind == JsonValueKind.String)
                    {
                        targetId =
                            idnoElem.GetString() ?? "";
                    }
                    else
                    {
                        targetId = idnoElem.ToString();
                    }
                }

                // await ActivityLogger.SendAsync(
                //     HttpContext,
                //     action: "postHistoryCall",
                //     targetId: targetId,
                //     targetType: "CUSTOMER",
                //     message: "postHistoryCall successfully",
                //     module: "postHistoryCall"
                // );

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
        public async Task<IActionResult> GetHistoryCall(
            string prospectBatch,
            string customerId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(prospectBatch) ||
                    string.IsNullOrWhiteSpace(customerId))
                {
                    return Content(
                        "[]",
                        "application/json");
                }

                var data =
                    await crmService.GetHistoryCall(
                        prospectBatch,
                        customerId);

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