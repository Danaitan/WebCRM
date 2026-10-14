# Implementation Plan — Post-login latency fix (webCRM behind /crmweb proxy)

## Context verified against the code

Repo root: `c:\Users\100664\Desktop\webCRM_GtiHub`. Project: `webCRM\webCRM.csproj`, `TargetFramework = net10.0`, `Nullable = enable`, `ImplicitUsings = enable`. On net10 both `Socket.ConnectAsync(IPAddress, int, CancellationToken)` and `new CancellationTokenSource(TimeSpan)` are available, and `CancellationTokenSource.CreateLinkedTokenSource(...)` is used to link the incoming `ct`.

Build/verify command (run from the project folder so the repo-level `artifacts/` output location is irrelevant and only this project is built):

```
dotnet build "c:\Users\100664\Desktop\webCRM_GtiHub\webCRM\webCRM.csproj" -c Debug
```

Expected outcome: `Build succeeded` with 0 errors. (There is no test project in the repo and the brief says do not add tests, so the build is the verification gate.)

### Confirmation of the three root causes (all three MATCH the brief)

1. **Session cookie path + blocking session — MATCHES.** `Program.cs` line 15: `var pathBase = Environment.GetEnvironmentVariable("PathBase") ?? "/crmweb";`. `AddSession` is at lines 29–34 and sets only `IdleTimeout` (24h), `Cookie.HttpOnly`, `Cookie.IsEssential`. It does NOT set `Cookie.Path` or `Cookie.SameSite`. `pathBase` is a top-level local declared at line 15, in scope at the `AddSession` call (line 29). The PathBase middleware (lines ~205–227) sets `context.Request.PathBase` to `/crmweb` (or `X-Forwarded-Prefix`), so without `Cookie.Path = pathBase` the session cookie default path can mismatch and fail to round-trip. Login cookies elsewhere (`LoginController` `userCde`) use `SameSite = SameSiteMode.Lax`, so Lax is the consistent choice.

2. **Fire-and-forget activity-log contention — MATCHES.** `CrmApiLoggingHandler.SendAsync` (lines ~33–96) calls `_ = LogCallAsync(...)` in its `finally` block (line ~84) on every CRM call except the skip-list. `LogCallAsync` (lines ~124–168) returns `_activityLog.SendAsync(...)` and is never awaited. `ActivityLogService.SendAsync` POSTs to `LOG_URL` via the named client `"ActivityLog"` using `await client.SendAsync(requestMessage)` at line 220 — with no CancellationToken, so a slow/unreachable LOG_URL ties up a pooled connection for up to the client `Timeout` (10s, `Program.cs` line 54; `ConnectTimeout` 5s, line 62). The skip-list `NotAllowedEndpoints` must stay unchanged.

3. **Connect/DNS fallback latency on first call — MATCHES.** The `"CRMApi"` named client's `ConnectCallback` (`Program.cs` lines ~109–182) does `Dns.GetHostAddressesAsync` (line 116) then `foreach (var addr in addresses)` calling `await socket.ConnectAsync(addr, port, ct)` (line 140) with no per-address timeout — it relies on handler `ConnectTimeout = 5s` (line 105). If DNS returns an unreachable address first (e.g. a non-routable IPv6), the first attempt blocks ~5s before failing over — the "waiting like a timeout" symptom. There is a single shared `socket` created once before the loop; the fix must create a fresh socket per address attempt because a socket that failed `ConnectAsync` cannot be reused.

Frontend `wwwroot/js/Home.js` is confirmed as the symptom source only (`getDashboardCustomerInfo` at line 627 fetches `window.appBase + '/Home/GetCustommerDashboard'`, invoked on DOM-ready at line 1144). No frontend change is needed; it is listed for context.

---

# Implementation Plan

- [x] 1. Set the session cookie Path and SameSite in the existing `AddSession` lambda so the session cookie round-trips under the `/crmweb` PathBase and stops creating fresh sessions that contend on the per-request session lock.
      Inside the `builder.Services.AddSession(options => { ... })` block (Program.cs lines 29–34), keep the existing three lines unchanged and add `options.Cookie.Path = pathBase;` and `options.Cookie.SameSite = SameSiteMode.Lax;`. `pathBase` (line 15) is already in scope. Add `using Microsoft.AspNetCore.Http;` only if `SameSiteMode` does not resolve under existing usings (it is in `Microsoft.AspNetCore.Http`; `ImplicitUsings` for Web SDK typically covers it — do not add a redundant using if it already compiles).
      Files: `webCRM/Program.cs`
      Verify: `dotnet build "c:\Users\100664\Desktop\webCRM_GtiHub\webCRM\webCRM.csproj" -c Debug` — Build succeeded, 0 errors.

- [x] 2. Reduce the `"ActivityLog"` named HttpClient timeouts in `Program.cs` so a slow/unreachable LOG_URL cannot hold a background log POST for ~10s. In the `AddHttpClient(ActivityLogService.HttpClientName, ...)` block, change `client.Timeout = TimeSpan.FromSeconds(10);` (line 54) to `TimeSpan.FromSeconds(4);`, and in its `SocketsHttpHandler` lower `ConnectTimeout = TimeSpan.FromSeconds(5)` (line 62) to `TimeSpan.FromSeconds(3)`. Leave `PooledConnectionLifetime`, `PooledConnectionIdleTimeout`, `MaxConnectionsPerServer`, and the SslOptions bypass unchanged.
      Files: `webCRM/Program.cs`
      Verify: `dotnet build ... webCRM.csproj -c Debug` — Build succeeded, 0 errors.

- [x] 3. Bound each activity-log POST with a short CancellationToken in `ActivityLogService.SendAsync` so a hung LOG_URL is abandoned at ~3s instead of waiting on the client Timeout, and swallow cancellation quietly. Replace the `using var response = await client.SendAsync(requestMessage);` call (line 220) with a block that creates `using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3));` and calls `await client.SendAsync(requestMessage, cts.Token);`. Add a dedicated `catch (OperationCanceledException)` (which covers `TaskCanceledException`) BEFORE the existing `catch (Exception ex)` that writes a single short `Console.WriteLine("[ActivityLogger] log POST canceled/timed out after 3s; skipping.")` and no stack trace; keep the existing broad `catch (Exception ex)` and its Console logging intact for real errors. Add `using System.Threading;` at the top if `CancellationTokenSource` does not already resolve (file currently imports `System`, `System.Net.Http`, etc.; add the using only if needed to compile).
      Files: `webCRM/Services/ActivityLogService.cs`
      Verify: `dotnet build ... webCRM.csproj -c Debug` — Build succeeded, 0 errors.

- [x] 4. Confirm the fire-and-forget call site stays fire-and-forget (no change expected). Visually verify in `CrmApiLoggingHandler.SendAsync` that the `finally` block still uses `_ = LogCallAsync(...)` (line ~84) and that `LogCallAsync` is not awaited anywhere, and that `NotAllowedEndpoints` / `ShouldSkipLogging` are unchanged. This is a no-edit guard item; make no code change unless an `await` on `LogCallAsync` is found (none exists today).
      Files: `webCRM/Services/CrmApiLoggingHandler.cs` (read-only check)
      Verify: `dotnet build ... webCRM.csproj -c Debug` — Build succeeded, 0 errors (confirms items 1–3 did not disturb this path).

- [x] 5. Make the `"CRMApi"` `ConnectCallback` fail fast on a dead first address: prefer IPv4, apply a short per-attempt connect timeout, and use a fresh socket per address. In `Program.cs` inside `handler.ConnectCallback` (lines ~109–182): (a) after `Dns.GetHostAddressesAsync` (line 116), order addresses IPv4-first, e.g. `var ordered = addresses.OrderBy(a => a.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork ? 0 : 1).ToArray();` and iterate `ordered`; (b) move socket creation INSIDE the `foreach` so each attempt gets a new `Socket` (dispose it on failure before continuing), since a socket that failed `ConnectAsync` cannot be retried; (c) for each attempt build `using var attemptCts = CancellationTokenSource.CreateLinkedTokenSource(ct); attemptCts.CancelAfter(TimeSpan.FromSeconds(2));` and call `await socket.ConnectAsync(addr, port, attemptCts.Token);`, treating a per-attempt cancellation (when `ct` itself is not cancelled) as a failed address so the loop continues to the next; (d) keep the "all addresses failed" path throwing the last `connectError` (or a `SocketException`); (e) keep the diagnostic logging (dns ms, connect ms, addrCount, usedAddr) — the per-connect success `LogWarning` MAY be downgraded to `LogInformation`. Add `using System.Linq;` only if `OrderBy` does not already resolve under existing usings.
      Files: `webCRM/Program.cs`
      Verify: `dotnet build ... webCRM.csproj -c Debug` — Build succeeded, 0 errors.

- [x] 6. Final full build to confirm the complete diff compiles and the certificate-validation bypass, named clients, primary constructors, and `SocketsHttpHandler` wiring are intact.
      Files: none (verification only)
      Verify: `dotnet build "c:\Users\100664\Desktop\webCRM_GtiHub\webCRM\webCRM.csproj" -c Debug` — Build succeeded, 0 errors, 0 warnings introduced by these edits.

## Notes / assumptions

- Timeout values chosen per the brief's ranges: ActivityLog client Timeout 4s + CTS 3s (CTS fires first), ActivityLog ConnectTimeout 3s; per-address CRMApi connect attempt 2s (within the 1.5–2s guidance). These are tunable later via code if LOG_URL/CRM latency profiles differ.
- No `appsettings`, environment variable names, the login flow's public behavior, the CRM API contract, or the skip-list are touched. The cert bypass (`RemoteCertificateValidationCallback => true`, `X509RevocationMode.NoCheck`) is preserved exactly.
- `using` additions are specified as conditional ("only if needed") because `ImplicitUsings` is enabled for the Web SDK and may already cover `System.Linq`, `System.Threading`, and `Microsoft.AspNetCore.Http`; the implementer should add a using only if the build reports the symbol unresolved.

---

## Verification evidence (implementation iteration 1)

Command run (from the project folder):

```
dotnet build "c:\Users\100664\Desktop\webCRM_GtiHub\webCRM\webCRM.csproj" -c Debug
```

Result: **Build succeeded. 0 Error(s), 3 Warning(s).** Time ~5.9s. Output: `webCRM -> ...\bin\Debug\net10.0\webCRM.dll`.

The 3 warnings are all **pre-existing and NOT introduced by these edits** (none occurs on an edited line):
- `Program.cs(24,5)` ASPDEPR005 — `ForwardedHeadersOptions.KnownNetworks` obsolete (ForwardedHeaders block, unmodified).
- `LoginController.cs(22,29)` CS9113 — unread primary-constructor parameter `env` (file not edited).
- `LoginController.cs(48,21)` CS0162 — unreachable code (file not edited).

Edits made:
1. **Program.cs AddSession** — added `options.Cookie.Path = pathBase;` and `options.Cookie.SameSite = SameSiteMode.Lax;`. `pathBase` (declared earlier at top level) confirmed in scope; `SameSiteMode` resolved under ImplicitUsings (no extra using needed).
2. **Program.cs ActivityLog named client** — `client.Timeout` 10s → 4s; handler `ConnectTimeout` 5s → 3s. Pooling/MaxConnections/SslOptions bypass left intact.
3. **ActivityLogService.SendAsync** — added `using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3));` and `client.SendAsync(requestMessage, cts.Token)`; added a dedicated `catch (OperationCanceledException)` (covers `TaskCanceledException`) that logs one short line with no stack trace, before the existing broad `catch (Exception ex)` (kept intact). Added `using System.Threading;`.
4. **CrmApiLoggingHandler** — read-only guard confirmed: call site is still fire-and-forget `_ = LogCallAsync(...)` in `finally`, `LogCallAsync` is never awaited, and `NotAllowedEndpoints` / `ShouldSkipLogging` are unchanged. No edit.
5. **Program.cs CRMApi ConnectCallback** — addresses ordered IPv4-first via `OrderBy(... InterNetwork ? 0 : 1).ToArray()`; a fresh `Socket` created per attempt (disposed on failure); each attempt bounded by `using var attemptCts = CancellationTokenSource.CreateLinkedTokenSource(ct)` + `CancelAfter(2s)`; incoming-`ct` cancellation re-thrown, otherwise failed address continues the loop; "all failed" still throws last `connectError`/`SocketException`; diagnostics preserved; success log downgraded `LogWarning` → `LogInformation`. `System.Linq` resolved under ImplicitUsings.

Every new `CancellationTokenSource` is disposed via `using`. The certificate-validation bypass (`RemoteCertificateValidationCallback => true`, `X509RevocationMode.NoCheck`) is unchanged. No appsettings or env-var names touched; login flow and CRM API contract unchanged.
