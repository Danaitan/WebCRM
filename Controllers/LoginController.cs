using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.Diagnostics;
using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using webCRM.Models;
using webCRM.Services;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace webCRM.Controllers
{
    public class LoginController(
        CRMService crmService,
        IConfiguration configuration,
        IWebHostEnvironment env
        ) : Controller
    {

        public async Task<IActionResult> Index(
            [FromQuery] string? user,
            [FromQuery] string? returnUrl)
        {
            try
            {
                var JWT_SECRET_KEY = Environment.GetEnvironmentVariable("JWT_SECRET_KEY") ?? "";
                string CookieLogToken = Request.Cookies["LogToken"] ?? "";

                string switchedRoleId =
                    HttpContext.Session.GetString("switchedRoleId") ?? "";
                string switchedRoleName =
                    HttpContext.Session.GetString("switchedRoleName") ?? "";

                string CookieCde = Request.Cookies["userCde"] ?? "";
                 string personalCode = "";

                if (!env.IsDevelopment())
                // if (false)
                {
                    if (!string.IsNullOrWhiteSpace(user))
                    {
                        Response.Cookies.Append(
                            "userCde",
                            user,
                            new CookieOptions
                            {
                                HttpOnly = true,
                                IsEssential = true,
                                SameSite = SameSiteMode.Lax
                            });
                        personalCode = DecodeBase64(user);
                    } else if (!string.IsNullOrWhiteSpace(CookieCde)){
                        personalCode = DecodeBase64(CookieCde);
                    } else {
                        return RedirectToMGResult();
                    }
                }

                bool isLogConnected = false;
                if (string.IsNullOrEmpty(CookieLogToken))
                {
                    try
                    {
                        var LogClientId = Environment.GetEnvironmentVariable("LOG_client_id") ?? "";
                        var LogClientSecret = Environment.GetEnvironmentVariable("LOG_client_secret") ?? "";

                        var body = JsonSerializer.SerializeToElement(new
                        {
                            client_id = LogClientId,
                            client_secret = LogClientSecret
                        });

                        var LogAuthResponse = await crmService.LogAuth(body);
                        string LogAuthContent = "";

                        if (LogAuthResponse != null && LogAuthResponse.Content != null)
                        {
                            LogAuthContent = await LogAuthResponse.Content.ReadAsStringAsync();
                            Console.WriteLine(
                                $"[LogAuth] HTTP {(int)LogAuthResponse.StatusCode} " +
                                $"({LogAuthResponse.StatusCode})");
                        }

                        string LogToken = "";

                        if (LogAuthResponse != null
                            && LogAuthResponse.IsSuccessStatusCode
                            && !string.IsNullOrWhiteSpace(LogAuthContent))
                        {
                            try
                            {
                                var LogAuthResult = JsonNode.Parse(LogAuthContent);
                                LogToken =
                                    LogAuthResult?["access_token"]?.ToString() ?? "";
                                if (!string.IsNullOrWhiteSpace(LogToken))
                                {
                                    isLogConnected = true;
                                }
                            }
                            catch (Exception parseEx)
                            {
                                Console.WriteLine(
                                    $"[LogAuth] Failed to parse response: {parseEx.Message}");
                            }
                        }

                        if (!string.IsNullOrWhiteSpace(LogToken))
                        {
                            Response.Cookies.Append(
                                "LogToken",
                                LogToken,
                                new CookieOptions
                                {
                                    HttpOnly = true,
                                    IsEssential = true,
                                    SameSite = SameSiteMode.Lax,
                                    Path = "/"
                                });

                            HttpContext.Items["LogToken"] = LogToken;
                        }
                        else
                        {
                            Console.WriteLine(
                                "[LogAuth] WARNING: Log service offline or access_token empty. Continuing login normally.");
                        }
                    }
                    catch (Exception exLog)
                    {
                        Console.WriteLine($"[LogAuth] Non-fatal log auth error: {exLog.Message}");
                    }
                }
                else
                {
                    HttpContext.Items["LogToken"] = CookieLogToken;
                    isLogConnected = true;
                }

                HttpContext.Session.SetString("LogServerStatus", isLogConnected ? "Connected" : "Disconnected");

                var traceId = ActivityLogger.ResetSessionTraceId(HttpContext);

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

                string Field(string key, string fallback = "")
                    => profile[key]?.ToString() ?? fallback;

                string pCode        = Field("personnel_code", personalCode);
                string pNameTh      = Field("personnel_name_TH");
                string pLastTh      = Field("personnel_last_TH");
                string pNameEn      = Field("personnel_name_EN");
                string pLastEn      = Field("personnel_last_EN");
                string email        = Field("e_mail");
                string groupEmail   = Field("groupEmail");
                string roleId       = Field("role_id");
                string branchNo     = Field("branch_no");
                string branch       = Field("branch");
                string funcId       = Field("func_id");
                string variableFunc = Field("variable_func");
                string func_name    = Field("func_name");
                string roleName     = Field("role_name");
                string company      = Field("companyCode");

                if (!string.IsNullOrWhiteSpace(switchedRoleId))
                {
                    roleId = switchedRoleId;
                    roleName = switchedRoleName;
                }

                if (string.IsNullOrWhiteSpace(roleId))
                {
                    HttpContext.Session.Clear();

                    return NoPermissionResult(
                        "ไม่มีสิทธิ์การใช้งานระบบ");
                }

                // Set Session

                string formattedBranchNo =
                    int.TryParse(branchNo, out int bNo)
                        ? bNo.ToString("00")
                        : branchNo;

                var sessionValues = new Dictionary<string, string>
                {
                    ["profile_welcome"] = $"[{pCode}] ({pNameTh} {pLastTh}) [{roleName}]",
                    ["fullNameEn"] = $"{pNameEn} {pLastEn}",
                    ["personalId"] = pCode,
                    ["email"] = email,
                    ["groupEmail"] = groupEmail,
                    ["company"] = company,
                    // ["company"] = "MIB",
                    ["fullNameTh"] = $"{pNameTh} {pLastTh}",
                    ["roleId"] = roleId,
                    ["roleName"] = roleName,
                    ["func_id"] = funcId,
                    ["variable_func"] = variableFunc,
                    ["func_name"] = func_name,
                    ["branchName"] = $"{formattedBranchNo}-{branch}"
                };

                foreach (var (key, value) in sessionValues)
                {
                    HttpContext.Session.SetString(key, value);
                }

                Console.WriteLine(
                    $"LOGIN SUCCESS: {pCode}");

                Console.WriteLine(
                    $"roleId: {HttpContext.Session.GetString("roleId")}");

                Console.WriteLine(
                    $"personalId: {HttpContext.Session.GetString("personalId")}");

                Console.WriteLine(
                    $"traceId: {traceId}");

                HttpContext.Session.Remove("switchedRoleId");
                HttpContext.Session.Remove("switchedRoleName");

                // Redirect

                if (!string.IsNullOrWhiteSpace(returnUrl)
                    && Url.IsLocalUrl(returnUrl))
                {
                    return Redirect(returnUrl);
                }

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

        private string GetMGDomain()
        {
            return Environment.GetEnvironmentVariable("ApiSettings__MGDomain")
                ?? Environment.GetEnvironmentVariable("MGDomain")
                ?? configuration["ApiSettings:MGDomain"]
                ?? configuration["MGDomain"]
                ?? "about:blank";
        }

        private IActionResult RedirectToMGResult()
        {
            string mgDomain = GetMGDomain();

            string safeUrl =
                System.Text.Json.JsonSerializer.Serialize(mgDomain);

            string html = $@"
                <!DOCTYPE html>
                <html lang=""th"">
                <head>
                    <meta charset=""utf-8"" />
                    <script>
                        window.location.replace({safeUrl});
                    </script>
                </head>
                <body></body>
                </html>";

            return Content(
                html,
                "text/html; charset=utf-8");
        }

        private IActionResult NoPermissionResult(string message = "ไม่มีสิทธิ์การใช้งานระบบ")
        {
            string mgDomain = GetMGDomain();

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
                                        window.location.href = '{mgDomain}';
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

        [HttpPost]
        public async Task<IActionResult> LogAuth(
            [FromBody] JsonElement body)
        {
            try
            {
                var response =
                    await crmService.LogAuth(body);

                if (response == null || response.Content == null)
                {
                    return Content(
                        JsonSerializer.Serialize(new
                        {
                            status = false,
                            message = "ไม่สามารถเชื่อมต่อ Server Log ได้ (ระบบทำงานในโหมดออฟไลน์)",
                            data = Array.Empty<object>()
                        }),
                        "application/json");
                }

                var data =
                    await response.Content.ReadAsStringAsync();

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

        public IActionResult Logout()
        {
            // Clear all session data
            HttpContext.Session.Clear();

            // Remove login cookies so the next visit re-authenticates via SSO
            Response.Cookies.Delete("LogToken");
            Response.Cookies.Delete("userCde");

            // Redirect back to the MG SSO domain
            return RedirectToMGResult();
        }

    }

}
