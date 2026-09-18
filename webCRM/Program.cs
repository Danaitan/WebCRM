
using System.Net.Http.Headers;
using webCRM.Services;
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();

builder.Services.AddHttpContextAccessor();

builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromHours(24);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

var apiDomain = Environment.GetEnvironmentVariable("ApiSettings__APIDomain");
var bearerToken = Environment.GetEnvironmentVariable("ApiSettings__BearerToken");

if (string.IsNullOrWhiteSpace(apiDomain))
{
    throw new InvalidOperationException("ApiSettings:APIDomain is not configured.");
}

if (string.IsNullOrWhiteSpace(bearerToken))
{
    throw new InvalidOperationException("ApiSettings:BearerToken is not configured.");
}

builder.Services.AddHttpClient("CRMApi", client =>
{
    client.BaseAddress = new Uri($"{apiDomain.TrimEnd('/')}/crm/api/v1/");

    client.Timeout = TimeSpan.FromSeconds(30);

    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
})
.ConfigurePrimaryHttpMessageHandler(() =>
{
    return new HttpClientHandler
    {
        ServerCertificateCustomValidationCallback =
            HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
    };
});

builder.Services.AddScoped<CRMService>();
var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

var defaultCulture =
    new System.Globalization.CultureInfo("th-TH");

var localizationOptions =
    new RequestLocalizationOptions
    {
        DefaultRequestCulture =
            new Microsoft.AspNetCore.Localization.RequestCulture(
                defaultCulture),

        SupportedCultures = new[] { defaultCulture },

        SupportedUICultures = new[] { defaultCulture }
    };

System.Globalization.CultureInfo.DefaultThreadCurrentCulture =
    defaultCulture;

System.Globalization.CultureInfo.DefaultThreadCurrentUICulture =
    defaultCulture;

app.UseRequestLocalization(localizationOptions);

app.UseStaticFiles();

app.UseHttpsRedirection();

app.UseRouting();

app.UseSession();

app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Login}/{action=Index}/{id?}");

app.Run();