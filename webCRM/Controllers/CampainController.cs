using webCRM.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Runtime.CompilerServices;
using webCRM.Services;

namespace webCRM.Controllers
{
    public class CampainController(
        CRMService crmService,
        IWebHostEnvironment webHostEnvironment
        ) : Controller
    {
        public async Task<IActionResult> Index()
        {
            return View("campain");
        }

        public async Task<CampainPagedResult> GetCampainList(
            string page = "1",
            string pageSize = "10",
            string status = "",
            string startDate = "",
            string endDate = "",
            string branch = "",
            string search = "",
            string sortCreateDate = "",
            bool isFilteroffCde = false,
            bool isFiltercompany = false
            )
        {
            try
            {
                string offCde = "";
                string company = "";

                if (isFilteroffCde){
                    offCde = HttpContext.Session.GetString("variable_func") ?? "";
                }
                if (isFiltercompany){
                    company = HttpContext.Session.GetString("company");
                }

                return await crmService.GetCampainList(
                    page,
                    pageSize,
                    status,
                    startDate,
                    endDate,
                    branch,
                    search,
                    sortCreateDate,
                    offCde,
                    company
                    );
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;

                return new CampainPagedResult();
            }
        }

        public async Task<string> DeleteCampain(string productId)
        {
            try
            {
                var result =
                    await crmService.DeleteCampain(productId);

                if (result.Success)
                {
                    // await ActivityLogger.SendAsync(
                    //     HttpContext,
                    //     action: "Remove Campaign",
                    //     targetId: productId,
                    //     targetType: "Campaign",
                    //     message: "Remove campaign successfully",
                    //     module: "putProductRemove"
                    // );

                    return "Remove Success";
                }

                return
                    $"Remove Failed: ({result.StatusCode}) {result.Error}";
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการลบข้อมูล: " + ex.Message;

                return "Remove Failed: " + ex.Message;
            }
        }

        [HttpPost]
        public async Task<IActionResult> PostCampain([FromBody] PostCampaign? request)
        {
            try
            {
                if (request == null)
                {
                    return Ok(new
                    {
                        status = "error",
                        message = "ไม่พบข้อมูล Campaign"
                    });
                }

                var company =
                    HttpContext.Session.GetString("company");

                if (request.ProductInfo != null)
                {
                    request.ProductInfo.ProductCompany = company;
                }

                var result =
                    await crmService.PostCampain(request);

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
                //     action: "Post Campaign",
                //     targetId: "",
                //     targetType: "Campaign",
                //     message: "Post campaign successfully",
                //     module: "postNewProduct"
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
        public async Task<List<MasterFilter>> GetMasterFilter(string? company = null)
        {
            try
            {
                var comp =
                    !string.IsNullOrWhiteSpace(company)
                        ? company
                        : HttpContext.Session.GetString("company")
                    ?? "MICRO";

                if (string.IsNullOrWhiteSpace(comp))
                {
                    comp = "MICRO";
                }

                return await crmService.GetMasterFilter(comp);
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;

                return new List<MasterFilter>();
            }
        }

        [HttpPost]
        public async Task<IActionResult> InsertFilter([FromBody] List<PostFilter>? request)
        {
            try
            {
                if (request == null)
                {
                    return Ok(new
                    {
                        status = "error",
                        message = "ไม่พบข้อมูล Filter"
                    });
                }

                var comp =
                    HttpContext.Session.GetString("company")
                    ?? "MICRO";

                if (string.IsNullOrWhiteSpace(comp))
                {
                    comp = "MICRO";
                }

                foreach (var item in request)
                {
                    if (string.IsNullOrWhiteSpace(item.fcompany))
                    {
                        item.fcompany = comp;
                    }
                }

                var result =
                    await crmService.InsertFilter(request);

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
        public async Task<List<GetFilterByGuid>> GetFilterByGuid(string fguid, string? company = null)
        {
            try
            {
                var comp =
                    !string.IsNullOrWhiteSpace(company)
                        ? company
                        : HttpContext.Session.GetString("company")
                            ?? "MICRO";

                if (string.IsNullOrWhiteSpace(comp))
                {
                    comp = "MICRO";
                }

                return await crmService.GetFilterByGuid(
                    fguid,
                    comp);
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;

                return new List<GetFilterByGuid>();
            }
        }

        [HttpPut]
        public async Task<IActionResult> UpdateCampaign([FromBody] PostCampaign request)
        {
            try
            {
                var result =
                    await crmService.UpdateCampaign(request);

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
                //     action: "Update Campaign",
                //     targetId: request.ProductInfo?.Id ?? "",
                //     targetType: "Campaign",
                //     message: "Update campaign successfully",
                //     module: "putProductsPhase3"
                // );

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
        public async Task<IActionResult> GetProspect(int page = 1, int pageSize = 10)
        {
            try
            {
var data = await crmService.GetProspect(
                page,
                pageSize);

                return Content(
                    data,
                    "application/json");
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;

                return Content(
                    $"{{\"page\": {page}, \"pageSize\": {pageSize}, \"count\": 0, \"data\": []}}",
                    "application/json");
            }
        }

        public async Task<string> GetCheckProductNo()
        {
            try
            {
                return await crmService.GetCheckProductNo();
            }
            catch (Exception ex)
            {
                ViewBag.ErrorMessage =
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + ex.Message;

                return "";
            }
        }

        [HttpGet]
        public async Task<IActionResult> getMasterObjective()
        {
            try
            {
                var data = await crmService.GetMasterObjective();

                return Content(
                    data,
                    "application/json");
            }
            catch (Exception ex)
            {
                return Content(
                    $"\"เกิดข้อผิดพลาดในการโหลดข้อมูล: {ex.Message}\"",
                    "application/json");
            }
        }

        [HttpPost]
        public async Task<IActionResult> PostFile([FromBody] PostFile request)
        {
            try
            {
                request.created_by =
                    HttpContext.Session.GetString("personalId")
                    ?? "";

                var result =
                    await crmService.PostFile(request);

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
                    status = "success",
                    id = result.FileId,
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
        public async Task<IActionResult> getFile(long Id)
        {
            try
            {
                var data =
                    await crmService.GetFile(Id);

                return Content(
                    data,
                    "application/json");
            }
            catch (Exception ex)
            {
                return Content(
                    $"\"เกิดข้อผิดพลาดในการโหลดข้อมูล: {ex.Message}\"",
                    "application/json");
            }
        }

        [HttpPost]
        public async Task<IActionResult> UploadCampaignFile(
            IFormFile file,
            string campaignCode)
        {
            try
            {
                if (file == null || file.Length == 0)
                {
                    return Ok(new
                    {
                        status = "error",
                        message = "กรุณาเลือกไฟล์"
                    });
                }

                if (string.IsNullOrWhiteSpace(campaignCode))
                {
                    return Ok(new
                    {
                        status = "error",
                        message =
                            "ไม่พบรหัสแคมเปญ กรุณาเลือกหรือสร้างแคมเปญก่อนแนบเอกสาร"
                    });
                }

                string contentRootPath =
                    webHostEnvironment.ContentRootPath
                    ?? Directory.GetCurrentDirectory();

                string folderPath =
                    Path.Combine(
                        contentRootPath,
                        "campaignFile",
                        campaignCode);

                Directory.CreateDirectory(folderPath);

                string originalFileName =
                    Path.GetFileName(file.FileName);

                string extension =
                    Path.GetExtension(originalFileName);

                var now = DateTime.Now;

                int thaiYear =
                    now.Year > 2400
                        ? now.Year
                        : now.Year + 543;

                string timeStamp =
                    $"{now.Day:D2}{now.Month:D2}{thaiYear}{now:HHmmss}";

                string cleanCampaignCode =
                    campaignCode.Replace("-", "").Trim();

                string fileName =
                    $"{cleanCampaignCode}{timeStamp}{extension}";

                string filePath =
                    Path.Combine(folderPath, fileName);

                int index = 1;

                while (System.IO.File.Exists(filePath))
                {
                    fileName =
                        $"{cleanCampaignCode}{timeStamp}_{index}{extension}";

                    filePath =
                        Path.Combine(folderPath, fileName);

                    index++;
                }

                await using (var stream = new FileStream(
                    filePath,
                    FileMode.Create,
                    FileAccess.Write,
                    FileShare.None,
                    81920,
                    useAsync: true))
                {
                    await file.CopyToAsync(stream);
                }

                string relativePath =
                    $"campaignFile/{campaignCode}/{fileName}";

                var postFileRequest = new PostFile
                {
                    name = originalFileName,
                    path = relativePath,
                    created_by = HttpContext.Session.GetString("personalId") ?? ""
                };

                // บันทึก file record ก่อน เพื่อดึง id กลับมาใช้ผูกกับ campaign
                var fileResult = await crmService.PostFile(postFileRequest);

                if (!fileResult.Success)
                {
                    return Ok(new
                    {
                        status = "error",
                        message = $"บันทึกไฟล์ไม่สำเร็จ (API status {fileResult.StatusCode})"
                    });
                }

                return Ok(new
                {
                    status = "success",
                    id = fileResult.FileId,
                    name = originalFileName,
                    path = relativePath,
                    data = fileResult.Response
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
        public IActionResult DownloadFile(
            string filePath,
            string? fileName = null)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(filePath))
                {
                    return NotFound("File path is empty.");
                }

                string contentRootPath =
                    webHostEnvironment.ContentRootPath
                    ?? Directory.GetCurrentDirectory();

                string rootPath =
                    Path.GetFullPath(
                        Path.Combine(contentRootPath, ".."));

                string cleanedRelativePath =
                    filePath
                        .TrimStart('/', '\\')
                        .Replace(
                            '/',
                            Path.DirectorySeparatorChar);

                string fullPath =
                    Path.GetFullPath(
                        Path.Combine(
                            contentRootPath,
                            cleanedRelativePath));

                string fullRootPath =
                    Path.GetFullPath(rootPath);

                string fullContentRootPath =
                    Path.GetFullPath(contentRootPath);

                if (!fullPath.StartsWith(
                        fullRootPath,
                        StringComparison.OrdinalIgnoreCase)
                    &&
                    !fullPath.StartsWith(
                        fullContentRootPath,
                        StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest("Invalid file path.");
                }

                if (!System.IO.File.Exists(fullPath))
                {
                    string altPath =
                        Path.GetFullPath(
                            Path.Combine(
                                rootPath,
                                cleanedRelativePath));

                    if (System.IO.File.Exists(altPath)
                        &&
                        (
                            altPath.StartsWith(
                                fullRootPath,
                                StringComparison.OrdinalIgnoreCase)
                            ||
                            altPath.StartsWith(
                                fullContentRootPath,
                                StringComparison.OrdinalIgnoreCase)
                        ))
                    {
                        fullPath = altPath;
                    }
                    else
                    {
                        return NotFound(
                            "File not found on server.");
                    }
                }

                string downloadFileName =
                    !string.IsNullOrWhiteSpace(fileName)
                        ? fileName
                        : Path.GetFileName(fullPath);

                string contentType =
                    "application/octet-stream";

                string ext =
                    Path.GetExtension(fullPath)
                        .ToLowerInvariant();

                switch (ext)
                {
                    case ".pdf":
                        contentType = "application/pdf";
                        break;

                    case ".doc":
                        contentType = "application/msword";
                        break;

                    case ".docx":
                        contentType =
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                        break;

                    case ".xls":
                        contentType =
                            "application/vnd.ms-excel";
                        break;

                    case ".xlsx":
                        contentType =
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                        break;

                    case ".png":
                        contentType = "image/png";
                        break;

                    case ".jpg":
                    case ".jpeg":
                        contentType = "image/jpeg";
                        break;

                    case ".txt":
                        contentType =
                            "text/plain; charset=utf-8";
                        break;
                }

                byte[] fileBytes =
                    System.IO.File.ReadAllBytes(fullPath);

                return File(
                    fileBytes,
                    contentType,
                    downloadFileName);
            }
            catch (Exception ex)
            {
                return BadRequest(
                    "Error downloading file: " + ex.Message);
            }
        }

        [HttpGet]
        public IActionResult PreviewFile(string filePath)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(filePath))
                {
                    return NotFound("File path is empty.");
                }

                string contentRootPath =
                    webHostEnvironment.ContentRootPath
                    ?? Directory.GetCurrentDirectory();

                string rootPath =
                    Path.GetFullPath(
                        Path.Combine(contentRootPath, ".."));

                string cleanedRelativePath =
                    filePath
                        .TrimStart('/', '\\')
                        .Replace(
                            '/',
                            Path.DirectorySeparatorChar);

                string fullPath =
                    Path.GetFullPath(
                        Path.Combine(
                            contentRootPath,
                            cleanedRelativePath));

                string fullRootPath =
                    Path.GetFullPath(rootPath);

                string fullContentRootPath =
                    Path.GetFullPath(contentRootPath);

                if (!fullPath.StartsWith(
                        fullRootPath,
                        StringComparison.OrdinalIgnoreCase)
                    &&
                    !fullPath.StartsWith(
                        fullContentRootPath,
                        StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest("Invalid file path.");
                }

                if (!System.IO.File.Exists(fullPath))
                {
                    string altPath =
                        Path.GetFullPath(
                            Path.Combine(
                                rootPath,
                                cleanedRelativePath));

                    if (System.IO.File.Exists(altPath)
                        &&
                        (
                            altPath.StartsWith(
                                fullRootPath,
                                StringComparison.OrdinalIgnoreCase)
                            ||
                            altPath.StartsWith(
                                fullContentRootPath,
                                StringComparison.OrdinalIgnoreCase)
                        ))
                    {
                        fullPath = altPath;
                    }
                    else
                    {
                        return NotFound(
                            "File not found on server.");
                    }
                }

                string contentType =
                    "application/octet-stream";

                string ext =
                    Path.GetExtension(fullPath)
                        .ToLowerInvariant();

                switch (ext)
                {
                    case ".pdf":
                        contentType = "application/pdf";
                        break;

                    case ".png":
                        contentType = "image/png";
                        break;

                    case ".jpg":
                    case ".jpeg":
                        contentType = "image/jpeg";
                        break;

                    case ".gif":
                        contentType = "image/gif";
                        break;

                    case ".webp":
                        contentType = "image/webp";
                        break;

                    case ".svg":
                        contentType = "image/svg+xml";
                        break;

                    case ".txt":
                        contentType =
                            "text/plain; charset=utf-8";
                        break;

                    default:
                        contentType =
                            "application/octet-stream";
                        break;
                }

                byte[] fileBytes =
                    System.IO.File.ReadAllBytes(fullPath);

                return File(
                    fileBytes,
                    contentType);
            }
            catch (Exception ex)
            {
                return BadRequest(
                    "Error previewing file: " + ex.Message);
            }
        }

        [HttpPut]
        public async Task<IActionResult> DeleteFile(long Id)
        {
            try
            {
                var result =
                    await crmService.DeleteFile(Id);

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
                    message = "Error updating file: " + ex.Message
                });
            }
        }

        [HttpGet]
        public async Task<IActionResult> getProductStatus()
        {
            try
            {
                var data = await crmService.GetProductStatus();
                var results = Content(data, "application/json");
                return results;
            }
            catch (Exception ex)
            {
                return Content(
                    $"\"เกิดข้อผิดพลาดในการโหลดข้อมูล: {ex.Message}\"",
                    "application/json");
            }
        }

    }
}