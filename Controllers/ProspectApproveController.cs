using Microsoft.AspNetCore.Mvc;
using webCRM.Services;

namespace webCRM.Controllers
{
    public class ProductApproveController(
        CRMService crmService) : Controller
    {
        public IActionResult Index()
        {
            return View("productApprove");
        }

        [HttpGet]
        public async Task<IActionResult> GetProspectCustomerView(
            string productBatch)
        {
            try
            {
                var data =
                    await crmService.GetProspectCustomerView(
                        productBatch);

                return Ok(data);
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;

                return Ok(new
                {
                    status = false,
                    message = ex.Message,
                    data = new { }
                });
            }
        }
    }
}