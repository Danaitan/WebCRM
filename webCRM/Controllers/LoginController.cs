using webCRM.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using webCRM.Services;

namespace webCRM.Controllers
{
    public class LoginController(CRMService crmService) : Controller
    {

        public async Task<IActionResult> Index([FromQuery] string? user)
        {
            try
            {
                string personalCode = "100664";

                if (!string.IsNullOrWhiteSpace(user))
                {
                    personalCode = DecodeBase64(user);
                }

                var rootNode =
                    await crmService.GetProfileByPersonalCode(personalCode);

                var profile =
                    rootNode is JsonArray arr && arr.Count > 0
                        ? arr[0]
                        : rootNode?["data"] ?? rootNode;

                if (profile == null)
                {
                    HttpContext.Session.Clear();

                    return NoPermissionResult(
                        "ไม่พบข้อมูลผู้ใช้งานในระบบ");
                }

                string pCode =
                    profile["personnel_code"]?.ToString()
                    ?? personalCode;

                string pNameTh =
                    profile["personnel_name_TH"]?.ToString()
                    ?? "";

                string pLastTh =
                    profile["personnel_last_TH"]?.ToString()
                    ?? "";

                string pNameEn =
                    profile["personnel_name_EN"]?.ToString()
                    ?? "";

                string pLastEn =
                    profile["personnel_last_EN"]?.ToString()
                    ?? "";

                string email =
                    profile["e_mail"]?.ToString()
                    ?? "";

                string groupEmail =
                    profile["groupEmail"]?.ToString()
                    ?? "";

                string roleId =
                    profile["role_id"]?.ToString()
                    ?? "";

                string branchNo =
                    profile["branch_no"]?.ToString()
                    ?? "";

                string branch =
                    profile["branch"]?.ToString()
                    ?? "";

                string funcId =
                    profile["func_id"]?.ToString()
                    ?? "";

                string variableFunc =
                    profile["variable_func"]?.ToString()
                    ?? "";

                string func_name =
                    profile["func_name"]?.ToString()
                    ?? "";

                string roleName =
                    profile["role_name"]?.ToString()
                    ?? "";

                string company =
                    profile["companyCode"]?.ToString()
                    ?? "";

                if (string.IsNullOrWhiteSpace(roleId))
                {
                    HttpContext.Session.Clear();

                    return NoPermissionResult(
                        "ไม่มีสิทธิ์การใช้งานระบบ");
                }

                // =========================
                // Set Session
                // =========================

                HttpContext.Session.SetString(
                    "profile_welcome",
                    $"[{pCode}] ({pNameTh} {pLastTh}) [{roleName}]");

                HttpContext.Session.SetString(
                    "fullNameEn",
                    $"{pNameEn} {pLastEn}");

                HttpContext.Session.SetString(
                    "personalId",
                    pCode);

                HttpContext.Session.SetString(
                    "email",
                    email);

                HttpContext.Session.SetString(
                    "groupEmail",
                    groupEmail);

                HttpContext.Session.SetString(
                    "company",
                    company);

                HttpContext.Session.SetString(
                    "fullNameTh",
                    $"{pNameTh} {pLastTh}");

                HttpContext.Session.SetString(
                    "roleId",
                    roleId);

                HttpContext.Session.SetString(
                    "func_id",
                    funcId);

                HttpContext.Session.SetString(
                    "variable_func",
                    variableFunc);

                HttpContext.Session.SetString(
                    "func_name",
                    func_name);

                string formattedBranchNo =
                    int.TryParse(branchNo, out int bNo)
                        ? bNo.ToString("00")
                        : branchNo;

                HttpContext.Session.SetString(
                    "branchName",
                    $"{formattedBranchNo}-{branch}");

                // =========================
                // DEBUG
                // =========================

                Console.WriteLine(
                    $"LOGIN SUCCESS: {pCode}");

                Console.WriteLine(
                    $"roleId: {HttpContext.Session.GetString("roleId")}");

                Console.WriteLine(
                    $"personalId: {HttpContext.Session.GetString("personalId")}");

                // =========================
                // Redirect
                // =========================

                return RedirectToAction("Index", "Home");
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);

                return Unauthorized(new
                {
                    message = $"Login failed: {ex.Message}"
                });
            }
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }

        private IActionResult NoPermissionResult(string message = "ไม่มีสิทธิ์การใช้งานระบบ")
        {
            string html = $@"
                <!DOCTYPE html>
                <html lang=""th"">
                <head>
                    <meta charset=""utf-8"" />
                    <meta name=""viewport""
                        content=""width=device-width, initial-scale=1.0"" />

                    <title>ไม่มีสิทธิ์การใช้งาน</title>

                    <link rel=""preconnect""
                        href=""https://fonts.googleapis.com"">

                    <link rel=""preconnect""
                        href=""https://fonts.googleapis.com""
                        crossorigin>

                    <link href=""https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600&display=swap""
                        rel=""stylesheet"">

                    <script src=""https://cdn.jsdelivr.net/npm/sweetalert2@11"">
                    </script>

                    <style>
                        body {{
                            font-family: 'Prompt', sans-serif;
                            background-color: #f8f9fa;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            height: 100vh;
                            margin: 0;
                        }}
                    </style>
                </head>

                <body>
                    <script>
                        document.addEventListener(
                            'DOMContentLoaded',
                            function () {{

                                Swal.fire({{
                                    icon: 'warning',
                                    title: 'แจ้งเตือน',
                                    text: '{message}',
                                    confirmButtonText: 'ตกลง',
                                    confirmButtonColor: '#0d6efd',
                                    allowOutsideClick: false,
                                    allowEscapeKey: false,

                                    customClass: {{
                                        popup: 'rounded-4 shadow'
                                    }}
                                }}).then((result) => {{

                                    if (result.isConfirmed) {{

                                        if (window.history.length > 1) {{
                                            window.history.back();
                                        }}
                                        else {{
                                            window.location.href = 'about:blank';
                                        }}
                                    }}
                                }});
                            }});
                    </script>
                </body>
                </html>";

            return Content(
                html,
                "text/html; charset=utf-8");
        }

        private static string DecodeBase64(string input)
        {
            if (string.IsNullOrWhiteSpace(input))
            {
                return string.Empty;
            }

            try
            {
                string s =
                    input.Trim()
                        .Replace('-', '+')
                        .Replace('_', '/');

                switch (s.Length % 4)
                {
                    case 2:
                        s += "==";
                        break;

                    case 3:
                        s += "=";
                        break;
                }

                byte[] bytes =
                    Convert.FromBase64String(s);

                return Encoding.UTF8.GetString(bytes);
            }
            catch
            {
                return input;
            }
        }

        public async Task<IActionResult> GetPage([FromQuery] string personalCode)
        {
            try
            {
                // เรียกผ่าน CRMService
                string json =
                    await crmService.GetPage(personalCode);

                return Content(
                    json,
                    "application/json");
            }
            catch (HttpRequestException ex)
            {
                return Unauthorized(new
                {
                    message =
                        $"API connection failed: {ex.Message}"
                });
            }
            catch (TaskCanceledException)
            {
                return Unauthorized(new
                {
                    message =
                        "API request timeout."
                });
            }
            catch (Exception ex)
            {
                return Unauthorized(new
                {
                    message =
                        $"Request failed: {ex.Message}"
                });
            }
        }

        public async Task<IActionResult> GetProfile([FromQuery] string? user = null)
    {
        try
        {
            // เรียกผ่าน CRMService
            string json =
                await crmService.GetProfile(user ?? "");

            return Content(
                json,
                "application/json");
        }
        catch (HttpRequestException ex)
        {
            return Unauthorized(new
            {
                message =
                    $"API connection failed: {ex.Message}"
            });
        }
        catch (TaskCanceledException)
        {
            return Unauthorized(new
            {
                message =
                    "API request timeout."
            });
        }
        catch (Exception ex)
        {
            return Unauthorized(new
            {
                message =
                    $"Request failed: {ex.Message}"
            });
        }
    }
        [HttpGet]
        public async Task<IActionResult> GetProfileByEmail([FromQuery] string email)
        {
            try
            {
                // เรียกผ่าน CRMService
                string json =
                    await crmService.GetProfileByEmail(email);

                return Content(
                    json,
                    "application/json");
            }
            catch (HttpRequestException ex)
            {
                return Unauthorized(new
                {
                    message =
                        $"API connection failed: {ex.Message}"
                });
            }
            catch (TaskCanceledException)
            {
                return Unauthorized(new
                {
                    message =
                        "API request timeout."
                });
            }
            catch (Exception ex)
            {
                return Unauthorized(new
                {
                    message =
                        $"Request failed: {ex.Message}"
                });
            }
        }
        
        // public async Task<IActionResult> PostDailyNotiAndEmail([FromBody] string personalCode)
        // {
        //     try
        //     {
        //         var handler = new HttpClientHandler
        //         {
        //             ServerCertificateCustomValidationCallback =
        //                 (message, cert, chain, errors) => true
        //         };

        //         using var client = new HttpClient(handler);

        //         var bearerToken =
        //             Environment.GetEnvironmentVariable("ApiSettings__BearerToken")
        //             ?? configuration["ApiSettings:BearerToken"];

        //         string? domain =
        //             Environment.GetEnvironmentVariable("ApiSettings__APIDomain")
        //             ?? configuration["ApiSettings:APIDomain"];

        //         if (string.IsNullOrEmpty(domain))
        //         {
        //             return Unauthorized(new
        //             {
        //                 message = "API Domain is not configured."
        //             });
        //         }

        //         client.DefaultRequestHeaders.Authorization =
        //             new AuthenticationHeaderValue("Bearer", bearerToken);

        //         string url = $"{domain}/crm/api/v1/p3/postDailyNotiAndEmail";

        //         var requestBody = new
        //         {
        //             personalCode = personalCode
        //         };

        //         var response = await client.PostAsJsonAsync(url, requestBody);

        //         string json = await response.Content.ReadAsStringAsync();

        //         if (!response.IsSuccessStatusCode)
        //         {
        //             return StatusCode((int)response.StatusCode, new
        //             {
        //                 message = "API request failed",
        //                 statusCode = (int)response.StatusCode,
        //                 response = json
        //             });
        //         }

        //         return Content(json, "application/json");
        //     }
        //     catch (Exception ex)
        //     {
        //         return StatusCode(500, new
        //         {
        //             message = ex.Message,
        //             stackTrace = ex.StackTrace
        //         });
        //     }
        // }

    }

}
