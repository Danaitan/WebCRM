using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Nodes;
using webCRM.Models;
using webCRM.Services;

namespace webCRM.Controllers
{

    [Route("sso")]
    public class SsoController(
        CRMService crmService,
        IConfiguration configuration) : Controller
    {

        [HttpPost("login")]
        [IgnoreAntiforgeryToken]
        public async Task<IActionResult> Login(
            [FromForm] string? access_token,
            [FromForm] string? targetUrl,
            [FromForm] string? returnUrl,
            [FromForm] string? url)
        {
            Console.Write("EntrySsoLogin");
            if (string.IsNullOrWhiteSpace(access_token))
            {
                return Unauthorized("Token missing");
            }

            // Secret Key ต้องตรงกับฝั่งที่ออก Token (CRMApi / Hub)
            var jwtSecret =
                Environment.GetEnvironmentVariable("JWT_SECRET_KEY")
                ?? configuration["JWT_SECRET_KEY"]
                ?? "";

            if (string.IsNullOrWhiteSpace(jwtSecret))
            {
                Console.WriteLine(
                    "[SSO] ERROR: JWT_SECRET_KEY is not configured.");

                return StatusCode(
                    500,
                    "SSO is not configured: JWT_SECRET_KEY is missing.");
            }

            ClaimsPrincipal principal;

            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var keyBytes = Encoding.UTF8.GetBytes(jwtSecret);

                // หมายเหตุสำคัญ:
                // Secret ฝั่ง Node (jsonwebtoken) อาจสั้นกว่า 256 บิต (เช่น "32B92!2#" = 64 บิต)
                // ซึ่ง Microsoft.IdentityModel v8 จะปฏิเสธ (ขึ้น error IDX10517 "kid is missing")
                // เพราะบังคับขนาดคีย์ HMAC ขั้นต่ำ 256 บิต — แต่ Node ไม่มีข้อจำกัดนี้
                // จึงตรวจ Signature เองด้วย HMACSHA256 เพื่อให้เข้ากันได้กับ Token จาก Node
                // (ยังคงตรวจสอบความถูกต้องของลายเซ็นอย่างเข้มงวด ไม่ได้ข้าม)
                var validationParams = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = false,
                    RequireSignedTokens = true,
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(2),
                    SignatureValidator = (tok, parms) =>
                    {
                        var jwt = new JwtSecurityToken(tok);
                        var parts = tok.Split('.');

                        if (parts.Length != 3)
                        {
                            throw new SecurityTokenInvalidSignatureException(
                                "Malformed token");
                        }

                        using var hmac = new HMACSHA256(keyBytes);
                        var computed =
                            hmac.ComputeHash(
                                Encoding.UTF8.GetBytes(
                                    $"{parts[0]}.{parts[1]}"));
                        var provided = Base64UrlEncoder.DecodeBytes(parts[2]);

                        if (!CryptographicOperations.FixedTimeEquals(
                                computed, provided))
                        {
                            throw new SecurityTokenInvalidSignatureException(
                                "Signature mismatch");
                        }

                        return jwt;
                    }
                };

                // โยน Exception ทันทีหาก Signature ไม่ตรง หรือ Token หมดอายุ
                principal =
                    tokenHandler.ValidateToken(
                        access_token,
                        validationParams,
                        out _);
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"[SSO] Token validation failed: {ex.Message}");

                return Unauthorized("Invalid or expired token");
            }

            // รหัสพนักงานอยู่ใน Claim "user" (เทียบเท่า personnel_code / ad_account)
            string? personalCode =
                principal.Claims.FirstOrDefault(c =>
                    c.Type is "user"
                        or "personnel_code"
                        or "ad_account")?.Value;

            if (string.IsNullOrWhiteSpace(personalCode))
            {
                Console.WriteLine(
                    "[SSO] Token verified but no user claim found.");

                return Unauthorized("Token does not contain a user identity");
            }

            Console.WriteLine($"[SSO] Token verified for user: {personalCode}");

            // สร้าง Session ของระบบ CRM เหมือนการล็อกอินปกติ
            var sessionError = await PopulateUserSessionAsync(personalCode);

            if (sessionError != null)
            {
                // ไม่พบโปรไฟล์ / ไม่มีสิทธิ์ -> คืนหน้าแจ้งเตือน
                return sessionError;
            }

            // เผื่อ Framework/Hub ส่งมาด้วยชื่อ returnUrl หรือ url แทน targetUrl
            string redirectPath =
                new[] { targetUrl, returnUrl, url }
                    .FirstOrDefault(u => !string.IsNullOrWhiteSpace(u))
                ?? Url.Action("Index", "Home")
                ?? "/";

            // HTTP 302 Redirect ไปยังหน้าหลักตามที่ Hub ระบุ
            return Redirect(redirectPath);
        }

        private async Task<IActionResult?> PopulateUserSessionAsync(
            string personalCode)
        {
            var traceId = ActivityLogger.ResetSessionTraceId(HttpContext);

            JsonNode? rootNode;
            try
            {
                rootNode =
                    await crmService.GetProfileByPersonalCode(personalCode);
            }
            catch (Exception ex)
            {
                // เรียก API โปรไฟล์ไม่สำเร็จ (เช่น API ล่ม / 403 / timeout)
                Console.WriteLine(
                    $"[SSO] Failed to load profile for {personalCode}: {ex.Message}");

                HttpContext.Session.Clear();
                return NoPermissionResult(
                    "ไม่สามารถเชื่อมต่อระบบเพื่อตรวจสอบข้อมูลผู้ใช้งานได้");
            }

            var profile =
                rootNode is JsonArray arr && arr.Count > 0
                    ? arr[0]
                    : rootNode?["data"] ?? rootNode;

            if (profile == null)
            {
                HttpContext.Session.Clear();
                return NoPermissionResult("ไม่พบข้อมูลผู้ใช้งานในระบบ");
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

            if (string.IsNullOrWhiteSpace(roleId))
            {
                HttpContext.Session.Clear();
                return NoPermissionResult("ไม่มีสิทธิ์การใช้งานระบบ");
            }

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

            Console.WriteLine($"[SSO] LOGIN SUCCESS: {pCode}");
            Console.WriteLine($"[SSO] roleId: {HttpContext.Session.GetString("roleId")}");
            Console.WriteLine($"[SSO] personalId: {HttpContext.Session.GetString("personalId")}");
            Console.WriteLine($"[SSO] traceId: {traceId}");

            return null;
        }

        private string GetMGDomain()
        {
            return Environment.GetEnvironmentVariable("ApiSettings__MGDomain")
                ?? Environment.GetEnvironmentVariable("MGDomain")
                ?? configuration["ApiSettings:MGDomain"]
                ?? configuration["MGDomain"]
                ?? "about:blank";
        }

        private IActionResult NoPermissionResult(
            string message = "ไม่มีสิทธิ์การใช้งานระบบ")
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

            return Content(html, "text/html; charset=utf-8");
        }
    }
}
