using webCRM.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace webCRM.Controllers
{
    public class LoginController(IConfiguration configuration) : Controller
    {
        private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString,
            Converters = { new NumberToStringConverter() }
        };
        public async Task<IActionResult> Index([FromQuery] string? user)
        {
            var result = await GetProfileByPersonalCode(user);
            if (result is ContentResult cr && cr.ContentType?.Contains("text/html") == true)
            {
                return cr;
            }
            if (result is UnauthorizedObjectResult or UnauthorizedResult)
            {
                return result;
            }
            return RedirectToAction("Index", "Home");
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }

        public async Task<IActionResult> GetProfileByPersonalCode([FromQuery] string? user = null)
        {
            try
            {
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using var client = new HttpClient(handler);

                var bearerToken = Environment.GetEnvironmentVariable("ApiSettings__BearerToken") ?? configuration["ApiSettings:BearerToken"];
                string? domain = Environment.GetEnvironmentVariable("ApiSettings__APIDomain") ?? configuration["ApiSettings:APIDomain"];

                if (string.IsNullOrEmpty(domain))
                {
                    return Unauthorized(new { message = "Login failed: API Domain is not configured. (ApiSettings:APILogin is null)" });
                }

                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

                string personalCode = "100664";
                // string personalCode = "690001";
                if (!string.IsNullOrWhiteSpace(user))
                {
                    personalCode = DecodeBase64(user);
                }

                string url = $"{domain}/crm/api/v1/p2/getProfileByPersonalCode/{personalCode}";
                var response = await client.GetAsync(url);
                response.EnsureSuccessStatusCode();
                string json = await response.Content.ReadAsStringAsync();

                try
                {
                    var rootNode = JsonNode.Parse(json);
                    var profile = (rootNode is JsonArray arr && arr.Count > 0) ? arr[0] : (rootNode?["data"] ?? rootNode);

                    if (profile != null)
                    {
                        string pCode = profile["personnel_code"]?.ToString() ?? personalCode;
                        string pNameTh = profile["personnel_name_TH"]?.ToString() ?? "";
                        string pLastTh = profile["personnel_last_TH"]?.ToString() ?? "";
                        string pNameEn = profile["personnel_name_EN"]?.ToString() ?? "";
                        string pLastEn = profile["personnel_last_EN"]?.ToString() ?? "";
                        string email = profile["e_mail"]?.ToString() ?? "";
                        string roleId = profile["role_id"]?.ToString() ?? "";
                        string branchNo = profile["branch_no"]?.ToString() ?? "";
                        string branch = profile["branch"]?.ToString() ?? "";
                        string func_id = profile["func_id"]?.ToString() ?? "";

                        // ตรวจสอบถ้าไม่มี role_id หรือ role_id เป็นค่าว่าง ให้แจ้งเตือนและย้อนกลับ
                        if (string.IsNullOrWhiteSpace(roleId))
                        {
                            HttpContext.Session.Clear();
                            return NoPermissionResult("ไม่มีสิทธิ์การใช้งานระบบ");
                        }

                        string company = "";
                        if (email.Contains("microleasingplc", StringComparison.OrdinalIgnoreCase)) company = "MICRO";
                        else if (email.Contains("microinsurebroker", StringComparison.OrdinalIgnoreCase)) company = "MIB";
                        else if (email.Contains("mfin", StringComparison.OrdinalIgnoreCase)) company = "MFIN";

                        HttpContext.Session.SetString("profile_welcome", $"[{pCode}] ({pNameTh} {pLastTh})");
                        HttpContext.Session.SetString("fullNameEn", $"{pNameEn} {pLastEn}");
                        HttpContext.Session.SetString("personalId", pCode);
                        HttpContext.Session.SetString("email", email);
                        HttpContext.Session.SetString("company", company);
                        HttpContext.Session.SetString("fullNameTh", $"{pNameTh} {pLastTh}");
                        HttpContext.Session.SetString("roleId", roleId);

                        string formattedBranchNo = int.TryParse(branchNo, out int bNo) ? bNo.ToString("00") : branchNo;
                        HttpContext.Session.SetString("branchName", $"{formattedBranchNo}-{branch}");

                        var loginLog = new 
                        {
                            personalCde = pCode,
                            action = "เข้าสู่ระบบ"
                        };

                        var content = new StringContent(
                            JsonSerializer.Serialize(loginLog),
                            Encoding.UTF8,
                            "application/json");

                        await client.PostAsync(
                            $"{domain}/crm/api/v1/loginlog",
                            content);
                    }
                    else
                    {
                        HttpContext.Session.Clear();
                        return NoPermissionResult("ไม่พบข้อมูลผู้ใช้งานในระบบ");
                    }
                }
                catch (JsonException)
                {
                    return Unauthorized(new { message = "Login failed: Invalid API Response format" });
                }

                return Content(json, "application/json");
            }
            catch (Exception ex)
            {
                return Unauthorized(new { message = $"Login failed: {ex.Message}" });
            }

        }

        private IActionResult NoPermissionResult(string message = "ไม่มีสิทธิ์การใช้งานระบบ")
        {
            string html = $@"
                <!DOCTYPE html>
                <html lang=""th"">
                <head>
                    <meta charset=""utf-8"" />
                    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"" />
                    <title>ไม่มีสิทธิ์การใช้งาน</title>
                    <link rel=""preconnect"" href=""https://fonts.googleapis.com"">
                    <link rel=""preconnect"" href=""https://fonts.gstatic.com"" crossorigin>
                    <link href=""https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600&display=swap"" rel=""stylesheet"">
                    <script src=""https://cdn.jsdelivr.net/npm/sweetalert2@11""></script>
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
                        document.addEventListener('DOMContentLoaded', function () {{
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
                                    }} else {{
                                        window.location.href = 'about:blank';
                                    }}
                                }}
                            }});
                        }});
                    </script>
                </body>
                </html>";
            return Content(html, "text/html; charset=utf-8");
        }

        private static string DecodeBase64(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return string.Empty;
            try
            {
                string s = input.Trim().Replace('-', '+').Replace('_', '/');
                switch (s.Length % 4)
                {
                    case 2: s += "=="; break;
                    case 3: s += "="; break;
                }
                byte[] bytes = Convert.FromBase64String(s);
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
                var handler = new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => { return true; }
                };
                using var client = new HttpClient(handler);

                var bearerToken = Environment.GetEnvironmentVariable("ApiSettings__BearerToken") ?? configuration["ApiSettings:BearerToken"];
                string? domain = Environment.GetEnvironmentVariable("ApiSettings__APIDomain") ?? configuration["ApiSettings:APIDomain"];

                if (string.IsNullOrEmpty(domain))
                {
                    return Unauthorized(new { message = "Login failed: API Domain is not configured. (ApiSettings:APILogin is null)" });
                }

                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
                string url = $"{domain}/crm/api/v1/p3/getPage?personalCode={personalCode}";

                var response = await client.GetAsync(url);

                response.EnsureSuccessStatusCode();

                string json = await response.Content.ReadAsStringAsync();

                return Content(json, "application/json");
            }
            catch (Exception ex)
            {
                return Unauthorized(new { message = $"Login failed: {ex.Message}" });
            }
        }
    
    }
}
