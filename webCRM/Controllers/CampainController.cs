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
            bool isFiltercompany = false,
            bool isOnlyAssigned = false
            )
        {
            try
            {
                string offCde = "";
                string company = "";
                string assingUser = "";

                if (isFilteroffCde){
                    offCde = HttpContext.Session.GetString("variable_func") ?? "";
                }
                if (isFiltercompany){
                    company = HttpContext.Session.GetString("company") ?? "";
                }

                if (isOnlyAssigned){
                    assingUser = HttpContext.Session.GetString("personalId") ?? "";
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
                    company,
                    assingUser
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
        public async Task<List<GetFilterByGuid>> GetFilterByGuid(string fguid)
        {
            try
            {
                return await crmService.GetFilterByGuid(
                    fguid);
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
        public async Task<IActionResult> getFile(string Id)
        {
            try
            {
                // รองรับได้ทั้งไอดีเดียว ("12") และหลายไอดีคั่นด้วยจุลภาค ("12,34,56")
                var ids = (Id ?? "")
                    .Split(new[] { ',', ' ' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(s => s.Trim())
                    .Where(s => long.TryParse(s, out var n) && n > 0)
                    .Select(long.Parse)
                    .Distinct()
                    .ToList();

                if (ids.Count == 0)
                {
                    return Content("[]", "application/json");
                }

                // ดึงข้อมูลไฟล์ของแต่ละไอดีแล้วรวมเป็น array เดียว โดยคงลำดับตามที่ส่งมา
                var merged = new List<JsonElement>();

                foreach (var fileId in ids)
                {
                    var raw = await crmService.GetFile(fileId);
                    if (string.IsNullOrWhiteSpace(raw)) continue;

                    try
                    {
                        using var doc = JsonDocument.Parse(raw);
                        var root = doc.RootElement;

                        if (root.ValueKind == JsonValueKind.Array)
                        {
                            foreach (var item in root.EnumerateArray())
                            {
                                merged.Add(item.Clone());
                            }
                        }
                        else if (root.ValueKind == JsonValueKind.Object)
                        {
                            // เผื่อ backend ห่อผลลัพธ์ไว้ใน data/result
                            if (root.TryGetProperty("data", out var dataEl) && dataEl.ValueKind == JsonValueKind.Array)
                            {
                                foreach (var item in dataEl.EnumerateArray())
                                    merged.Add(item.Clone());
                            }
                            else if (root.TryGetProperty("result", out var resultEl) && resultEl.ValueKind == JsonValueKind.Array)
                            {
                                foreach (var item in resultEl.EnumerateArray())
                                    merged.Add(item.Clone());
                            }
                            else
                            {
                                merged.Add(root.Clone());
                            }
                        }
                    }
                    catch
                    {
                        // ข้าม response ที่ไม่ใช่ JSON ที่ถูกต้อง
                    }
                }

                var json = JsonSerializer.Serialize(merged);
                return Content(json, "application/json");
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
            // New SaveToDMS
            // try
            // {
            //     if (file == null || file.Length == 0)
            //     {
            //         return Ok(new
            //         {
            //             status = "error",
            //             message = "กรุณาเลือกไฟล์"
            //         });
            //     }

            //     if (string.IsNullOrWhiteSpace(campaignCode))
            //     {
            //         return Ok(new
            //         {
            //             status = "error",
            //             message =
            //                 "ไม่พบรหัสแคมเปญ กรุณาเลือกหรือสร้างแคมเปญก่อนแนบเอกสาร"
            //         });
            //     }

            //     string dmsUrl =
            //         Environment.GetEnvironmentVariable("Post_DMS")
            //         ?? "https://micro-dev-docker.microleasingplc.com:7104/dms/api/v1/interface/uploads";

            //     string dmsToken =
            //         Environment.GetEnvironmentVariable("DMS_BearerToken")
            //         ?? "";

            //     string statusValue = "printing";
            //     string traceId = $"TRC-{DateTime.Now:yyyy}-{DateTime.Now:HHmmssfff}";
            //     string owner = HttpContext.Session.GetString("personalId") ?? "system";
            //     string companyId = Environment.GetEnvironmentVariable("DMS_companyId") ?? "";
            //     string buId = Environment.GetEnvironmentVariable("DMS_buId") ?? "";
            //     string docTypeId = Environment.GetEnvironmentVariable("DMS_docTypeId") ?? "";
            //     string storeId = Environment.GetEnvironmentVariable("DMS_storeId") ?? "";
            //     string remark = $"อัปโหลดจาก WebCRM แคมเปญ {campaignCode}";

            //     string originalFileName = Path.GetFileName(file.FileName);

            //     var handler = new HttpClientHandler
            //     {
            //         ServerCertificateCustomValidationCallback =
            //             (message, cert, chain, errors) => true
            //     };

            //     using var client = new HttpClient(handler);

            //     if (!string.IsNullOrWhiteSpace(dmsToken))
            //     {
            //         client.DefaultRequestHeaders.Authorization =
            //             new AuthenticationHeaderValue("Bearer", dmsToken);
            //     }

            //     using var form = new MultipartFormDataContent();

            //     await using var fileStream = file.OpenReadStream();
            //     var streamContent = new StreamContent(fileStream);
            //     streamContent.Headers.ContentType =
            //         new MediaTypeHeaderValue(
            //             string.IsNullOrWhiteSpace(file.ContentType)
            //                 ? "application/pdf"
            //                 : file.ContentType);
            //     form.Add(streamContent, "files", originalFileName);

            //     form.Add(new StringContent(statusValue), "status");
            //     form.Add(new StringContent(traceId), "traceId");
            //     form.Add(new StringContent(owner), "owner");
            //     form.Add(new StringContent(companyId), "companyId");
            //     form.Add(new StringContent(buId), "buId");
            //     form.Add(new StringContent(docTypeId), "docTypeId");
            //     form.Add(new StringContent(storeId), "storeId");
            //     form.Add(new StringContent(remark), "remark");

            //     var dmsResponse = await client.PostAsync(dmsUrl, form);

            //     string dmsBody = await dmsResponse.Content.ReadAsStringAsync();

            //     if (!dmsResponse.IsSuccessStatusCode)
            //     {
            //         return Ok(new
            //         {
            //             status = "error",
            //             message =
            //                 $"อัปโหลดไปยัง DMS ไม่สำเร็จ (HTTP {(int)dmsResponse.StatusCode})",
            //             data = dmsBody
            //         });
            //     }

            //     // แกะค่า sp_file_id / doc_file_id จาก response ของ DMS
            //     string spFileId = "";
            //     string docFileId = "";
            //     string returnedFileName = originalFileName;

            //     try
            //     {
            //         using var doc = JsonDocument.Parse(dmsBody);
            //         var root = doc.RootElement;

            //         if (root.TryGetProperty("details", out var details)
            //             && details.ValueKind == JsonValueKind.Array
            //             && details.GetArrayLength() > 0)
            //         {
            //             var first = details[0];

            //             if (first.TryGetProperty("sp_file_id", out var sp))
            //                 spFileId = sp.GetString() ?? "";

            //             if (first.TryGetProperty("doc_file_id", out var docId))
            //                 docFileId = docId.GetString() ?? "";

            //             if (first.TryGetProperty("fileName", out var fn))
            //                 returnedFileName = fn.GetString() ?? originalFileName;
            //         }
            //     }
            //     catch
            //     {
            //         // ถ้า parse ไม่ได้ ยังคงส่ง raw body กลับไปให้ฝั่ง client จัดการ
            //     }

            //     // เก็บ path เป็น reference ของ DMS: "dms:<doc_file_id>:<sp_file_id>"
            //     // เพื่อให้โครงสร้าง file record เหมือนเดิม (name, path, created_by)
            //     // ตอนดึงไฟล์/เปิดดูไฟล์จะ detect prefix "dms:" แล้วไปเรียก DMS แทนไฟล์ในเครื่อง
            //     string relativePath = $"dms:{docFileId}:{spFileId}";

            //     var postFileRequest = new PostFile
            //     {
            //         name = returnedFileName,
            //         path = relativePath,
            //         created_by = HttpContext.Session.GetString("personalId") ?? ""
            //     };

            //     // บันทึก file record เพื่อดึง id (ตัวเลข) กลับมาใช้ผูกกับ campaign เหมือนเดิม
            //     var fileResult = await crmService.PostFile(postFileRequest);

            //     if (!fileResult.Success)
            //     {
            //         return Ok(new
            //         {
            //             status = "error",
            //             message = $"บันทึกไฟล์ไม่สำเร็จ (API status {fileResult.StatusCode})",
            //             data = dmsBody
            //         });
            //     }

            //     return Ok(new
            //     {
            //         status = "success",
            //         id = fileResult.FileId,
            //         name = returnedFileName,
            //         path = relativePath,
            //         sp_file_id = spFileId,
            //         doc_file_id = docFileId,
            //         traceId = traceId,
            //         data = fileResult.Response
            //     });
            // }
            // catch (Exception ex)
            // {
            //     return Ok(new
            //     {
            //         status = "error",
            //         message = ex.Message
            //     });
            // }

            // Old SaveToLocal
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
        public async Task<IActionResult> DownloadFile(
            string filePath,
            string? fileName = null)
        {
            // New DownloadFromDMS
            // try
            // {
            //     if (string.IsNullOrWhiteSpace(filePath))
            //     {
            //         return NotFound("File path is empty.");
            //     }

            //     var (dmsBytes, dmsContentType) = await FetchDmsFileAsync(filePath);
            //     if (dmsBytes == null)
            //     {
            //         return NotFound("File not found on DMS.");
            //     }

            //     string dmsDownloadName =
            //         !string.IsNullOrWhiteSpace(fileName)
            //             ? fileName
            //             : "download";

            //     return File(dmsBytes, dmsContentType, dmsDownloadName);
            // }
            // catch (Exception ex)
            // {
            //     return BadRequest(
            //         "Error downloading file: " + ex.Message);
            // }

            // Old DownloadFromLocal

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
        public async Task<IActionResult> PreviewFile(string filePath)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(filePath))
                {
                    return NotFound("File path is empty.");
                }

                // New PreviewFromDMS
                // var (dmsBytes, dmsContentType) = await FetchDmsFileAsync(filePath);
                // if (dmsBytes == null)
                // {
                //     return NotFound("File not found on DMS.");
                // }

                // return File(dmsBytes, dmsContentType);

                // Old PreviewFromLocal
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

        private async Task<(byte[]? Bytes, string ContentType)> FetchDmsFileAsync(string dmsPath)
        {
            try
            {
                // dms:<doc_file_id>:<sp_file_id>
                var parts = dmsPath.Split(':');
                string docFileId = parts.Length > 1 ? parts[1] : "";
                string spFileId = parts.Length > 2 ? parts[2] : "";

                if (string.IsNullOrWhiteSpace(docFileId)
                    && string.IsNullOrWhiteSpace(spFileId))
                {
                    return (null, "application/octet-stream");
                }

                string idForDownload =
                    !string.IsNullOrWhiteSpace(docFileId) ? docFileId : spFileId;

                string uploadUrl =
                    Environment.GetEnvironmentVariable("Post_DMS")
                    ?? "https://micro-dev-docker.microleasingplc.com:7104/dms/api/v1/interface/uploads";

                string downloadUrl =
                    Environment.GetEnvironmentVariable("Get_DMS")
                    ?? uploadUrl.Replace(
                        "/interface/uploads",
                        $"/interface/download/{Uri.EscapeDataString(idForDownload)}",
                        StringComparison.OrdinalIgnoreCase);

                // ถ้า Get_DMS มี placeholder {id} ให้แทนที่ด้วยรหัสไฟล์
                downloadUrl = downloadUrl.Replace("{id}", Uri.EscapeDataString(idForDownload));

                string dmsToken =
                    Environment.GetEnvironmentVariable("ApiSettings__BearerToken")
                    ?? "";

                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback =
                        (message, cert, chain, errors) => true
                };

                using var client = new HttpClient(handler);

                if (!string.IsNullOrWhiteSpace(dmsToken))
                {
                    client.DefaultRequestHeaders.Authorization =
                        new AuthenticationHeaderValue("Bearer", dmsToken);
                }

                var response = await client.GetAsync(downloadUrl);

                if (!response.IsSuccessStatusCode)
                {
                    return (null, "application/octet-stream");
                }

                byte[] bytes = await response.Content.ReadAsByteArrayAsync();

                string contentType =
                    response.Content.Headers.ContentType?.MediaType
                    ?? "application/pdf";

                return (bytes, contentType);
            }
            catch
            {
                return (null, "application/octet-stream");
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