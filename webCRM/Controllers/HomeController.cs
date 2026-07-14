using webCRM.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace webCRM.Controllers
{
    public class HomeController : Controller
    {
        public async Task<IActionResult> Index()
        {
            var profileWelcome = HttpContext.Session.GetString("profile_welcome");
            if (!string.IsNullOrEmpty(profileWelcome))
            {
                ViewData["profile_welcome"] = profileWelcome;
            }
            else
            {
                return RedirectToAction("Index", "Login");
            }
            
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }

        #region Helper

        private void SetCookie(string key, string value)
        {
            HttpContext.Response.Cookies.Append(key, value, new CookieOptions
            {
                Expires = DateTimeOffset.UtcNow.AddHours(24),
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Strict
            });
        }

        #endregion
    }
}
