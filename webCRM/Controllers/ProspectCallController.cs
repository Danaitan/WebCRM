using webCRM.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace webCRM.Controllers
{
    public class ProspectCallController(IConfiguration configuration) : Controller
    {
        string? bearerToken = Environment.GetEnvironmentVariable("ApiSettings__BearerToken") ?? configuration["ApiSettings:BearerToken"];
        string? domain = Environment.GetEnvironmentVariable("ApiSettings__APIDomain") ?? configuration["ApiSettings:APIDomain"];
        string? token3CX = Environment.GetEnvironmentVariable("ApiSettings__Token_3CX") ?? configuration["ApiSettings:Token_3CX"];

        public async Task<IActionResult> Index()
        {
            return View("prospectCall");
        }

    }

    public class TriggerCallRequest
    {
        public string? destination { get; set; }
    }
    
}
