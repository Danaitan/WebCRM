# Post-login latency fix for webCRM behind the /crmweb proxy

The change targets the stall users see right after login, where the dashboard's first CRM API call appears to hang on a timeout. It attacks three independent sources of delay: a session cookie that could not round-trip under the `/crmweb` PathBase (forcing a fresh, lock-contended session per request), a fire-and-forget activity-log POST that could pin a pooled connection for up to 10s against a slow log endpoint, and a `ConnectCallback` that would try a non-routable IPv6 address first and block for the full 5s connect timeout before failing over. The fixes are a cookie Path/SameSite addition, tighter ActivityLog timeouts plus a 3s cancellation guard, and an IPv4-first connect strategy with a short per-attempt timeout. The certificate-validation bypass, the logging skip-list, the fire-and-forget call site, and all env-var/appsettings names are left untouched.

Watch for: the ActivityLog cancellation token is a standalone 3s CTS rather than one linked to an incoming token (confirmed) — this is correct here because `SendAsync` takes no `CancellationToken` and the call site never passes one, so there is nothing to link against. No blocking issues found.

**Verdict**: APPROVED

## High-level view

The session fix adds `Cookie.Path = pathBase` and `Cookie.SameSite = Lax` to the existing `AddSession` lambda. `pathBase` resolves from the `PathBase` env var (default `/crmweb`) at top-level scope and is the same value the PathBase middleware applies to `Request.PathBase`, so the cookie path now matches the path the app actually serves under. The three pre-existing options (IdleTimeout, HttpOnly, IsEssential) are preserved, and Lax matches the SameSite mode already used for the `userCde` login cookie.

The activity-log fix caps the named `ActivityLog` client at a 4s Timeout and 3s ConnectTimeout and wraps the POST in a 3s `CancellationTokenSource`, so a hung log endpoint is abandoned at ~3s instead of ~10s. A dedicated `catch (OperationCanceledException)` swallows the timeout with a single log line and no stack trace, ahead of the existing broad catch that still handles real errors. The fire-and-forget call site in `CrmApiLoggingHandler` and the `NotAllowedEndpoints` skip-list are unchanged.

The connect fix orders DNS results IPv4-first, creates a fresh socket per address, and bounds each attempt with a 2s timeout via a CTS linked to the incoming connect token. A per-attempt timeout (when the outer token is not cancelled) is treated as a failed address and the loop advances; genuine outer-token cancellation re-throws; exhausting all addresses still throws the last connect error. Every `CancellationTokenSource` is disposed through `using`, and the socket is disposed on both connect failure and `NetworkStream` construction failure.

<details>
<summary>Issues (0)</summary>

No blocking or non-blocking actionable findings. The three fixes match the brief, edge cases are handled, resources are disposed, and no out-of-scope behavior changed.

</details>

<details>
<summary>Details</summary>

### Session cookie path under the reverse proxy

The `AddSession` lambda now sets `options.Cookie.Path = pathBase` and `options.Cookie.SameSite = SameSiteMode.Lax` alongside the untouched `IdleTimeout`, `HttpOnly`, and `IsEssential` (confirmed). `pathBase` is declared once at top level (`Environment.GetEnvironmentVariable("PathBase") ?? "/crmweb"`) and is in scope at the `AddSession` call that follows it (confirmed). This is the same value the later PathBase middleware assigns to `context.Request.PathBase`, so the session cookie's path now matches the path prefix the browser sees. Without it, the default cookie path and the proxied path could diverge, the cookie would not be sent back, and each request would mint a new session — the per-request session lock then serializes those requests and produces the post-login stall. `SameSiteMode.Lax` is consistent with the `userCde` login cookie in `LoginController`, which already uses Lax (confirmed).

One behavioral nuance worth naming: `pathBase` is read once at startup, while the request-time middleware prefers the `X-Forwarded-Prefix` header and only falls back to `pathBase`. If a deployment sends a forwarded prefix that differs from the startup `PathBase` value, the cookie path (fixed at startup) and the runtime path base could differ. That is a pre-existing property of how the two values are sourced, not something this change introduces, and the default path matches in the documented `/crmweb` setup.

### ActivityLog timeout and cancellation guard

The named `ActivityLog` client's `Timeout` drops from 10s to 4s and its `SocketsHttpHandler.ConnectTimeout` from 5s to 3s; pooling settings, `MaxConnectionsPerServer`, and the SSL bypass are untouched (confirmed). Inside `ActivityLogService.SendAsync`, the POST is now `await client.SendAsync(requestMessage, cts.Token)` with `using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3))`, so the 3s CTS fires before the 4s client timeout and a hung `LOG_URL` releases its pooled connection at ~3s. The CTS is disposed via `using` (confirmed).

The new `catch (OperationCanceledException)` sits before the existing broad `catch (Exception ex)` and writes a single short line without a stack trace; the broad catch is otherwise intact and still logs real failures with their stack trace (confirmed). `OperationCanceledException` is the correct type to catch here since it covers the `TaskCanceledException` that `HttpClient` raises on timeout.

The CTS is a standalone timer rather than one linked to an incoming token. That is the right call: `SendAsync` exposes no `CancellationToken` parameter and the fire-and-forget invocation in `CrmApiLoggingHandler` passes none, so there is no caller token to honor. Because the log POST runs detached from the originating CRM request, bounding it purely on its own 3s budget is what keeps a slow log endpoint from starving the connection pool that real traffic shares.

### CRMApi connect strategy: IPv4-first with per-attempt timeout

The `ConnectCallback` resolves addresses, then orders them `InterNetwork` (IPv4) before everything else so a non-routable IPv6 address returned first by DNS no longer consumes the whole connect budget before failover. Each iteration creates a fresh `Socket` — necessary because a socket that has failed `ConnectAsync` cannot be retried — and the attempt is bounded by `using var attemptCts = CancellationTokenSource.CreateLinkedTokenSource(ct)` with `CancelAfter(2s)` (confirmed). The CTS is disposed per iteration via `using`.

The failure handling distinguishes the two cancellation causes correctly: on any attempt exception the socket is disposed, and if `ct.IsCancellationRequested` the exception re-throws (the outer caller is giving up); otherwise it is recorded as `connectError` and the loop moves to the next address. This means a 2s per-attempt timeout is treated as a dead address rather than an abort, which is exactly the fast-failover behavior intended. If no address connects, the callback throws the last `connectError` (or a fresh `SocketException` as a fallback), preserving the original "all addresses failed" contract. Diagnostic logging (dns ms, connect ms, addrCount, usedAddr) is preserved; the per-connect success line is `LogInformation`. On the success path the `NetworkStream` is constructed with `ownsSocket: true` inside a try/catch that disposes the socket if construction throws, so there is no socket leak on that edge.

### Preserved behavior and scope

The certificate-validation bypass is untouched on both clients: the `ActivityLog` handler keeps `X509RevocationMode.NoCheck` and `RemoteCertificateValidationCallback => true`, and the `CRMApi` handler keeps the same bypass gated behind `!isCheckCert` (confirmed). The `NotAllowedEndpoints` skip-list and `ShouldSkipLogging` in `CrmApiLoggingHandler` are byte-for-byte the same, and the call site remains `_ = LogCallAsync(...)` in the `finally` block, never awaited (confirmed). The `CRMApi` client's 30s `Timeout`, base address, and bearer auth header are unchanged, so no public login-flow or CRM API behavior shifts beyond the connect strategy. No `appsettings` values or environment variable names were altered, and no unrelated refactoring appears in the touched files.

### Verification evidence

Per `plan.md`, the implementer ran `dotnet build "...\webCRM.csproj" -c Debug` and recorded **Build succeeded, 0 Error(s), 3 Warning(s)**. The three warnings (ASPDEPR005 on the ForwardedHeaders block, CS9113 and CS0162 in `LoginController.cs`) are pre-existing and fall on lines this change set does not modify — `LoginController.cs` is not among the edited files, and the ForwardedHeaders block is unchanged. The build evidence is present and credible; no re-run was performed. There is no test project in the repo and the brief did not request adding one, so the build is the verification gate.

</details>

<details>
<summary>File map</summary>

- `Program.cs` — AddSession cookie Path/SameSite; ActivityLog client Timeout 10s→4s and ConnectTimeout 5s→3s; CRMApi ConnectCallback reworked to IPv4-first with fresh socket and 2s per-attempt timeout.
- `Services/ActivityLogService.cs` — 3s CancellationTokenSource around the log POST and a dedicated OperationCanceledException catch.
- `Services/CrmApiLoggingHandler.cs` — read-only guard; unchanged (skip-list and fire-and-forget call site confirmed intact).

No access to `git diff` in this environment (git not installed/not a repo); review performed against the current on-disk file states cross-checked with the implementation plan.

</details>
