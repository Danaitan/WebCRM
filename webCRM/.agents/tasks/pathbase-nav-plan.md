# Implementation Plan — PathBase-aware client navigation & favicon fix (webCRM)

## Goal

Make the ASP.NET Core MVC app prefix-correct **inside the app** so that NO browser
navigation request ever hits the domain root without the `/crmweb` PathBase prefix.
Today, JS navigations assign root-absolute URLs (`/`, `/Login`, dynamic sidebar
`/Campain`, …) directly to `window.location.href`, bypassing the existing `appUrl()`
wrapper in `app-base.js`. Behind the Nginx Proxy Manager (`location /crmweb`) the proxy
has no upstream for bare root paths, so those requests 504 — which is what makes the tab
spinner hang and page navigation feel slow. The favicon root GET has the same cause.

## Design decisions (made during exploration, grounded in the code)

1. **Centralize the fix in `app-base.js`, not per-file.** `app-base.js` already owns the
   base-path logic (`withBase`/`window.appUrl`) and already wraps `fetch`/XHR/jQuery. The
   missing piece is navigation. Adding `window.appNavigate` + a single delegated capture-phase
   click listener there catches *every* dynamically-rendered `<a href="/...">` (including the
   sidebar links) in one place, and keeps the empty-base (local root) path a strict no-op.
   Rationale: one guarded entry point beats scattering `appUrl()` calls across every click handler.

2. **Confirmed origin of the user-reported `GET /Campain 504`.** It is NOT in `Home.js`
   (no `window.location` there). The sidebar menu is re-rendered at runtime by
   `renderSidebarMenu()` in `layout.js` (`<a href="${path}">` at ~line 1460 and
   `<a href="${cPath}">` at ~line 1429), where `path`/`cPath` come straight from menu API data
   as raw controller paths like `/Campain`. These replace the static Razor `~/Campain` links
   (which Razor would have resolved to `/crmweb/Campain`). Clicking the regenerated link
   navigates the browser to bare `/Campain` → proxy 504. The delegated click listener (decision 1)
   fixes this generically; we additionally prefix at render time for correctness and to keep
   active-state detection honest.

3. **Still fix the 3 hardcoded `window.location.href` assignments** (campaign.js ×2, layout.js ×1)
   even though the delegated listener only covers `<a>` clicks — these are direct JS assignments,
   not anchor clicks, so the listener never sees them. `prospectCall.js:1924` uses `tel:` and is
   correctly left alone.

4. **Favicon:** keep the Razor `~/favicon.ico` `<link>` (resolves to `/crmweb/favicon.ico`) and add a
   legacy `shortcut icon` link. The browser's *implicit* root `GET /favicon.ico` cannot be fixed
   from inside the app; document the one-line Nginx fallback as the reliable fix for that single request.

## Project facts

- Framework: .NET 10 (`webCRM/webCRM.csproj`, `net10.0`). No test project in the repo.
- PathBase: `Program.cs` sets `pathBase = Environment.GetEnvironmentVariable("PathBase") ?? "/crmweb"`
  and assigns `context.Request.PathBase`. **Do not touch** server routing / PathBase middleware.
- `_Layout.cshtml` injects `window.appBase` from `Url.Content("~/")` (trailing slash trimmed) and
  loads `app-base.js` immediately after, in `<head>` — load order is already correct.
- Build/verify command: `dotnet build webCRM/webCRM.csproj` (changes are JS/CSHTML; build confirms
  the Razor view still compiles). Runtime verification is manual in the browser (see steps).

## Constraints

- Preserve ALL existing `app-base.js` wrappers (fetch / XHR / jQuery) exactly.
- Empty `appBase` (local root run) must stay a strict no-op — no listener attached, `appUrl` is identity.
- Match existing `app-base.js` style: IIFE, `'use strict'`, `withBase` naming, Thai comments fine.
- Keep the diff tight: only `app-base.js`, `campaign.js`, `layout.js`, minimally `_Layout.cshtml`.
- No new tests. No refactoring of unrelated code. Do not change server-side code.

---

# Implementation Plan

- [x] 1. Extend `app-base.js` with navigation support, without altering existing wrappers.
      In the EXISTING IIFE, keep the early `if (!base)` return (empty base stays a no-op: `appUrl`
      is identity and nothing below runs). AFTER the existing `window.appUrl = withBase;` line and the
      fetch/XHR/jQuery wrapper blocks (do not modify those blocks), add:
      (a) `window.appNavigate = function (url) { window.location.assign(withBase(url)); };`
      (b) a single delegated **capture-phase** click listener on `document`:
      `document.addEventListener('click', handler, true);`. In `handler(e)`:
        - Left button only: bail if `e.button !== 0`.
        - Bail on modifier keys: `e.metaKey || e.ctrlKey || e.shiftKey || e.altKey`.
        - Bail if `e.defaultPrevented`.
        - Find the anchor: `var a = e.target.closest && e.target.closest('a');` bail if `!a`.
        - New-tab/external targets: bail if `a.target` is set to anything other than `_self`
          (i.e. `_blank`, `_parent`, `_top`, named frame) — read via `a.getAttribute('target')`.
        - Read the RAW attribute: `var href = a.getAttribute('href');` (NOT the resolved `a.href`
          DOM property). Bail if falsy.
        - Skip these href prefixes (leave untouched): `#`, `javascript:`, `mailto:`, `tel:`,
          `data:`, `blob:`, `http://`, `https://`, `//`.
        - Only act on root-absolute in-app paths: require `href.charAt(0) === '/'` (the `//`
          case is already excluded above).
        - Compute `var target = withBase(href);`. If `target === href` (already under base, so
          `withBase` was a no-op) do nothing — let the browser handle it.
        - Otherwise `e.preventDefault(); window.location.assign(target);`.
      Keep all of (a)/(b) INSIDE the IIFE after the `if (!base) { … return; }` guard so an empty
      base never attaches the listener. Use `withBase`/`appUrl` for every URL rewrite — do not
      duplicate the prefixing logic.
      Files: webCRM/wwwroot/js/app-base.js
      Verify: `dotnet build webCRM/webCRM.csproj` succeeds (sanity: static asset unchanged in a way
      that breaks the view). Then in the browser under `/crmweb`: click a dynamically-rendered sidebar
      link (e.g. Campaign) and confirm the address bar + network request go to
      `/crmweb/Campain` (200), not `/Campain` (504). Run the app locally at root and confirm clicking
      the same links still works unchanged (listener is a no-op, `appUrl` identity).

- [x] 2. Fix the two hardcoded home-button navigations in `campaign.js`.
      At lines ~1726 and ~1730 (inside the `#homeActionBtn` and `#backActionBtn` click handlers),
      change `window.location.href = "/";` to
      `window.location.href = (window.appUrl ? window.appUrl("/") : "/");`
      (guarded so it still works if `app-base.js` somehow hasn't loaded). Both occurrences.
      Files: webCRM/wwwroot/js/campaign.js
      Verify: `dotnet build webCRM/webCRM.csproj` succeeds. In the browser under `/crmweb`, on the
      Campaign page click the home/back buttons and confirm navigation goes to `/crmweb/` (200), not
      `/` (504). At root, confirm it still goes to `/`.

- [x] 3. Fix the role-switch `/Login` navigation in `layout.js`.
      At line ~1842, the code builds `returnUrl` from `window.location.pathname + search + hash`
      (lines ~1840–1842) then assigns `window.location.href = '/Login?returnUrl=' + encodeURIComponent(returnUrl);`.
      Keep the `returnUrl` build logic UNCHANGED. Wrap only the `/Login` path:
      `window.location.href = (window.appUrl ? window.appUrl('/Login') : '/Login') + '?returnUrl=' + encodeURIComponent(returnUrl);`
      Rationale: `returnUrl` is the raw current pathname (which already includes `/crmweb` in prod,
      so it must NOT be re-prefixed); only the destination `/Login` needs the base.
      Files: webCRM/wwwroot/js/layout.js
      Verify: `dotnet build webCRM/webCRM.csproj` succeeds. In the browser under `/crmweb`, trigger a
      role switch (user `100664` or `690001`) and confirm it navigates to
      `/crmweb/Login?returnUrl=%2Fcrmweb%2F...` (200), not `/Login...` (504), and lands back on the
      original page. At root, confirm it navigates to `/Login?returnUrl=/...`.

- [x] 4. Prefix dynamic sidebar links at render time in `layout.js` (belt-and-suspenders; also keeps
      active-state detection correct). In `renderSidebarMenu()`, the children loop (~line 1420) sets
      `const cPath = child.Path ?? child.path ?? '#';` and the top-level else branch (~line 1459)
      uses `path`. Introduce a prefixed value for the `href` ONLY (do not change the value passed to
      `isSidebarPathActive`/`getSidebarIcon`, which compare against raw controller paths):
        - children: compute `const cHref = (window.appUrl && cPath !== '#') ? window.appUrl(cPath) : cPath;`
          and use `href="${cHref}"` in the template at ~line 1429.
        - top-level leaf: compute `const pHref = (window.appUrl && path !== '#') ? window.appUrl(path) : path;`
          and use `href="${pHref}"` in the template at ~line 1460.
      Leave `isSidebarPathActive(path)` / `getSidebarIcon(path)` calls using the raw `path`/`cPath`.
      This makes the rendered DOM links already correct even before the click listener fires, and is a
      no-op at root (`appUrl` identity). The delegated listener from item 1 remains the catch-all.
      Files: webCRM/wwwroot/js/layout.js
      Verify: `dotnet build webCRM/webCRM.csproj` succeeds. In the browser under `/crmweb`, inspect the
      rendered sidebar anchors and confirm their `href` already reads `/crmweb/Campain` etc.; clicking
      navigates to the prefixed URL (200). Confirm the active-menu highlight still works on each page.
      At root, confirm hrefs are unprefixed and highlighting still works.

- [x] 5. Add a legacy favicon link in `_Layout.cshtml` and document the implicit-root limitation.
      Keep the existing line 9 `<link rel="icon" type="image/x-icon" href="~/favicon.ico" asp-append-version="true" />`.
      Immediately after it add: `<link rel="shortcut icon" href="~/favicon.ico" />` (Razor `~/`
      resolves to `/crmweb/favicon.ico`). Add a short Razor/HTML comment noting that the browser's
      IMPLICIT root `GET /favicon.ico` cannot be redirected from inside the app and that the reliable
      fix is the one-line Nginx fallback:
      `location = /favicon.ico { return 301 /crmweb/favicon.ico; }`
      Files: webCRM/Views/Shared/_Layout.cshtml
      Verify: `dotnet build webCRM/webCRM.csproj` succeeds (view compiles). In the browser under
      `/crmweb`, confirm the explicit favicon request goes to `/crmweb/favicon.ico` (200). Note in the
      network tab that an implicit `GET /favicon.ico` may still appear/504 until the Nginx fallback is
      added — this is expected and documented, not an app bug.

- [x] 6. Final integration pass: full build + manual smoke test, then clean up.
      Run the complete build and exercise every changed navigation path once more under `/crmweb` to
      confirm no request hits a bare root path, and once at local root to confirm no behavior changed.
      Confirm the existing `app-base.js` fetch/XHR/jQuery wrappers still prefix API calls (e.g. the
      dashboard `GetCustommerDashboard` call still 200s). Remove any temporary debug logging added
      during implementation.
      Files: (no new changes expected — verification only)
      Verify: `dotnet build webCRM/webCRM.csproj` succeeds with no warnings introduced by these edits.
      Manual checklist (all under `/crmweb`, all expected 200, none 504): sidebar Campaign link,
      sidebar child links, Campaign home/back buttons, role-switch → Login round-trip, explicit favicon.
      Repeat at local root (`PathBase=""` or root profile) and confirm identical pre-change behavior.

## Notes / honest gaps

- The implicit browser `GET /favicon.ico` at the domain root is genuinely NOT fixable from inside the
  app when the proxy does not forward root paths. The documented Nginx one-liner
  (`location = /favicon.ico { return 301 /crmweb/favicon.ico; }`) is the correct place to solve that
  one request. Everything else (sidebar nav, home/back, login, dashboard API) is fixed in-app.
- Could not run the app end-to-end during planning (planner does not execute the server). All runtime
  "Verify" steps are written for the coder to confirm in-context; the `/Campain` and favicon-root 504s
  are included as confirm-during-implementation items per the task, not dismissed. The source origin of
  `/Campain` is confirmed by code reading (dynamic `renderSidebarMenu` in `layout.js`).
- `isSidebarPathActive` compares `window.location.pathname` (prefixed in prod) against raw menu paths;
  item 4 deliberately leaves that comparison on raw paths to avoid changing active-highlight behavior.
  If, during implementation, the coder observes the active highlight is wrong in prod, that is a
  separate pre-existing issue — flag it, do not expand scope here.

## Verification evidence

Command run (from repo root, Windows PowerShell):

```
dotnet build "c:\Users\100664\Desktop\webCRM_GtiHub\webCRM\webCRM.csproj" -c Debug
```

Result:

```
  Determining projects to restore...
  All projects are up-to-date for restore.
  webCRM -> c:\Users\100664\Desktop\webCRM_GtiHub\webCRM\bin\Debug\net10.0\webCRM.dll

Build succeeded.
    0 Warning(s)
    0 Error(s)

Time Elapsed 00:00:02.15
```

Build succeeded with 0 errors and 0 warnings. The `webCRM.dll` copy step completed without an
MSB3026/MSB3061 file-lock warning in this run (no running instance held the output assembly). These
edits are JS/CSHTML, so the clean build confirms the Razor view still compiles; the JS behavior
changes are not exercised by the C# compiler and were verified by re-reading the files (below).

Post-build file re-read confirmation:
- `app-base.js` — existing fetch / XMLHttpRequest.open / jQuery.ajaxPrefilter wrappers preserved
  unchanged; `window.appNavigate` and the capture-phase delegated click listener are both appended
  inside the IIFE after the `if (!base) { ...; return; }` guard, so empty base stays a strict no-op
  (`appUrl` identity, listener never attached). Listener reads raw `getAttribute('href')`, skips
  `#/javascript:/mailto:/tel:/data:/blob:/http://https:////`, skips non-`_self` targets and
  modifier/non-left-button clicks, and only `preventDefault()`+`location.assign` when
  `withBase(href) !== href`.
- `campaign.js` — lines 1726 and 1730 both route `"/"` through `window.appUrl ? window.appUrl("/") : "/"`.
- `layout.js` — role-switch at line 1846 wraps only `/Login` via guarded `appUrl`, returnUrl build
  (pathname+search+hash) unchanged; sidebar render prefixes `cHref`/`pHref` for `href` only (lines
  1428/1431 and 1462/1464), raw path still fed to `isSidebarPathActive`/`getSidebarIcon`.
- `_Layout.cshtml` — keeps `~/favicon.ico` icon link, adds `<link rel="shortcut icon" href="~/favicon.ico" />`,
  documents the implicit-root `GET /favicon.ico` limitation and the Nginx one-liner fallback.

Runtime (browser under `/crmweb` vs local root) verification is manual and outside this build
environment; it is left as the documented manual smoke-test checklist above.
