using webCRM.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace webCRM.Controllers
{
    public class ProspectAssignController : Controller
    {
        public async Task<IActionResult> Index()
        {
            return View("prospectAssign");
        }

    }
}
