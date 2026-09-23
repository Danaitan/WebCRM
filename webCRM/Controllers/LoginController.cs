using webCRM.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using webCRM.Services;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.IdentityModel.Tokens;

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
                string switchedRoleId =
                    HttpContext.Session.GetString("switchedRoleId") ?? "";
                string switchedRoleName =
                    HttpContext.Session.GetString("switchedRoleName") ?? "";

                string CookieCde = Request.Cookies["userCde"] ?? "";
                string personalCode = "100664";
                // string personalCode = "690001";

                if (!env.IsDevelopment())
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

                // If the user manually switched their role before this
                // re-login, keep that role instead of the profile default.
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
                    "roleName",
                    roleName);

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

                // The switched role has now been applied to the freshly
                // rebuilt session, so the one-shot marker is no longer
                // needed. Clearing it lets a future natural login fall
                // back to the personnel's default role.
                HttpContext.Session.Remove("switchedRoleId");
                HttpContext.Session.Remove("switchedRoleName");

                // =========================
                // Redirect
                // =========================

                // Return to the page the user was on before re-login,
                // but only if it is a safe local URL.
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
        
        [HttpPost("ssoLogin")]
        public async Task<IActionResult> SsoLogin([FromForm] string access_token, [FromForm] string targetUrl)
        {
            if (string.IsNullOrWhiteSpace(access_token)) return Unauthorized("Token missing");
            try
            {
                var JWT_SECRET_KEY = Environment.GetEnvironmentVariable("ApiSettings__WebDomain") ?? "";
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.UTF8.GetBytes(JWT_SECRET_KEY);
                // 1. ตรวจสอบ Signature และวันหมดอายุ
                var validationParams = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                };
                // จะโยน Exception ถ้า Token ปลอมหรือหมดอายุ
                var principal = tokenHandler.ValidateToken(access_token, validationParams, out _);
                // 2. ดึงข้อมูล
                var username = principal.Claims.FirstOrDefault(c => c.Type == "user")?.Value;
                // 3. สร้าง Cookie / Session ของระบบปลายทาง
                var claims = new List<Claim> { new Claim(ClaimTypes.Name, username ?? "Unknown") };
                var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
                await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identity));
                // 4. สั่ง HTTP 302 Redirect ไปยังหน้าหลักตามเป้าหมาย
                var redirectPath = string.IsNullOrEmpty(targetUrl) ? "/" : targetUrl;
                return Redirect(redirectPath);
            }
            catch
            {
                return Unauthorized("Invalid or expired token");
            }
        }

    }

}
