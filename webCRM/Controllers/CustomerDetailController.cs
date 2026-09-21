using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Headers;
using System.Text.Json;
using webCRM.Models;
using webCRM.Services;

namespace webCRM.Controllers
{
    public class CustomerDetailController(
        CRMService crmService) : Controller
    {
        private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            NumberHandling =
                System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString,
            Converters =
            {
                new NumberToStringConverter()
            }
        };

        // =========================================================
        // Index
        // =========================================================

        public IActionResult Index()
        {
            var fullNameEn =
                HttpContext.Session.GetString("fullNameEn");

            if (!string.IsNullOrEmpty(fullNameEn))
            {
                ViewData["fullNameEn"] = fullNameEn;
            }

            // The customer list is loaded by performSearch on demand. Loading it
            // here delays the first page response and prevents the browser from
            // showing any loading feedback while a large result is fetched.
            return View("customerDetail");
        }

        // =========================================================
        // Customer List
        // =========================================================

        public async Task<List<ResponseCustomerDetail>> GetCustomerList(
            string idno)
        {
            try
            {
                return await crmService.GetCustomerList(idno);
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;

                return new List<ResponseCustomerDetail>();
            }
        }

        // =========================================================
        // Contact List
        // =========================================================

        [HttpGet]
        public async Task<ResponseContactList> GetContact(
            string idno)
        {
            try
            {
                return await crmService.GetContact(idno);
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;

                return new ResponseContactList();
            }
        }

        // =========================================================
        // Contact Info
        // =========================================================

        [HttpGet]
        public async Task<IActionResult> GetContactInfo(
            string idno,
            string company)
        {
            try
            {
                if (company == "Micro")
                {
                    var result =
                        await crmService.GetContactInfo<ContractInfoMicro>(
                            idno,
                            company);

                    return Ok(result);
                }

                if (company == "MFIN")
                {
                    var result =
                        await crmService.GetContactInfo<ContractInfoMFIN>(
                            idno,
                            company);

                    return Ok(result);
                }

                if (company == "MIB")
                {
                    var result =
                        await crmService.GetContactInfo<ContractInfoMIB>(
                            idno,
                            company);

                    return Ok(result);
                }

                return BadRequest("Invalid company code.");
            }
            catch (HttpRequestException ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }

        // =========================================================
        // Receive List
        // =========================================================

        public async Task<IActionResult> GetReceiveList(
            string contno,
            string company)
        {
            try
            {
                string data =
                    await crmService.GetReceiveList(
                        contno,
                        company);

                return Content(
                    data,
                    "application/json");
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;

                return Content(
                    "[]",
                    "application/json");
            }
        }

        // =========================================================
        // Claim List
        // =========================================================

        public async Task<List<ResponseClaim>> GetClaimList(
            string tracking)
        {
            try
            {
                return await crmService.GetClaimList(tracking);
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;

                return new List<ResponseClaim>();
            }
        }

        // =========================================================
        // PDPA
        // =========================================================

        public async Task<IActionResult> GetPDPA(
            string company)
        {
            try
            {
                string data =
                    await crmService.GetPDPA(company);

                return Content(
                    data,
                    "application/json");
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;

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

        // =========================================================
        // Check PDPA
        // =========================================================

        public async Task<IActionResult> GetCheckPDPA(
            string idno)
        {
            try
            {
                string data =
                    await crmService.GetCheckPDPA(idno);

                return Content(
                    data,
                    "application/json");
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;

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
    }
}