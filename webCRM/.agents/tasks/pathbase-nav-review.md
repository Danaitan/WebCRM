# PathBase-aware client navigation and favicon fix for webCRM

Behind the Nginx Proxy Manager the app serves under `/crmweb`, but several client-side navigations assigned bare root-absolute URLs (`/`, `/Login`, dynamically rendered sidebar paths like `/Campain`) straight to `window.location.href`, bypassing the existing `app-base.js` prefixing wrappers. The proxy has no upstream for bare root paths, so those requests 504 — the tab spinner hang and sluggish navigation the user reported. The change centralizes a navigation fix in `app-base.js` (a `window.appNavigate` helper plus a single capture-phase delegated click listener), prefixes the three hardcoded `window.location.href` assignments and the dynamically rendered sidebar hrefs, and adds a legacy favicon link. Server routing and the PathBase middleware are untouched; the diff is confined to JS and one Razor view.

Watch for: the browser's implicit root `GET /favicon.ico` is NOT fixable from inside the app and still needs a one-line Nginx fallback — the view documents this honestly rather than claiming a full fix (confirmed). The empty-base (local root) path stays a strict no-op: the listener is never attached and `appUrl` is identity (confirmed).

**Verdict**: APPROVED

## High-level view

The core fix lives in `app-base.js` inside the existing IIFE, after the `if (!base) { ...; return; }` guard. The fetch / `XMLHttpRequest.open` / `jQuery.ajaxPrefilter` wrappers are preserved exactly; the new code is appended, not interleaved. `window.appNavigate` wraps `location.assign(withBase(url))`, and a capture-phase click listener on `document` catches dynamically rendered in-app anchors. Because every new construct sits after the empty-base early return, root-running behavior is byte-for-byte unchanged.

The delegated listener reads the raw `getAttribute('href')` rather than the resolved `.href` property, which is the correct choice — the DOM `.href` would already be absolute and would defeat the scheme/prefix checks. It skips the full set of non-navigational and external schemes, skips modifier-key and non-left-button clicks, skips non-`_self` targets, and only calls `preventDefault` + `location.assign` when `withBase(href)` actually differs from the raw href. That difference check is what keeps already-prefixed links and the empty-base case from being double-handled.

The three direct `window.location.href` assignments (campaign.js home/back, layout.js role-switch Login) are guarded through `window.appUrl` so they still work if `app-base.js` somehow has not loaded. The role-switch `returnUrl` is built from the raw current `pathname+search+hash` and only the `/Login` destination is prefixed — correct, because the current pathname already carries `/crmweb` in production and must not be prefixed twice.

The sidebar render in `renderSidebarMenu()` prefixes only the `href` values (`cHref`/`pHref`), leaving the raw `cPath`/`path` feeding `isSidebarPathActive`/`getSidebarIcon` so active-highlight detection is unchanged. This makes the rendered DOM correct even before the listener fires; the listener remains the catch-all.

The `/Campain` 504 origin is the dynamically rendered sidebar link, now fixed at both render time and by the listener. All other `/Campain` references in the codebase are `fetch` calls (prefixed by the existing wrapper) or `window.open` to new tabs — none are same-tab navigations.

The favicon handling keeps the path-base-aware `~/favicon.ico` link, adds a `shortcut icon` link, and documents in a Razor comment that the implicit root `GET /favicon.ico` needs the Nginx `location = /favicon.ico { return 301 /crmweb/favicon.ico; }` fallback. That honesty matters: the app-side link does not and cannot stop the browser's implicit root request.

<details>
<summary>Issues (1)</summary>

1. **Implicit root favicon still needs Nginx (informational, documented)** — the browser's implicit `GET /favicon.ico` at the domain root cannot be redirected from inside the app; the view documents the one-line Nginx fallback. No app-side action; call it out to whoever owns the Nginx config so the tab spinner fully resolves in production.

</details>

<details>
<summary>Details</summary>

### Navigation fix centralized in app-base.js

The empty-base early return is unchanged (`window.appUrl = function (u) { return u; }; return;`), and the new code is strictly appended after `window.appUrl = withBase;` and the fetch / `XMLHttpRequest.prototype.open` / `jQuery.ajaxPrefilter` wrapper blocks — those three wrappers (including the deferred `DOMContentLoaded` re-hook for late-loading jQuery) are byte-for-byte the same as before (confirmed). `window.appNavigate` routes through the same `withBase`, so no prefixing logic is duplicated.

The capture-phase listener (`document.addEventListener('click', handler, true)`) bails on `e.button !== 0`, any of `metaKey/ctrlKey/shiftKey/altKey`, and `e.defaultPrevented`; resolves the anchor via `e.target.closest('a')`; and bails on a `target` attribute other than `_self`. It reads the raw `a.getAttribute('href')` rather than the resolved `.href` property — the detail that makes the scheme checks meaningful, since the DOM property would already be absolute. It skips `#`, `javascript:`, `mailto:`, `tel:`, `data:`, `blob:`, `http://`, `https://`, `//`, requires `href.charAt(0) === '/'`, and only acts when `withBase(href)` differs from the raw href:

```js
var target = withBase(href);
if (target === href) {
    return; // already under base -> let the browser handle it
}
e.preventDefault();
window.location.assign(target);
```

### Three direct navigations prefixed

campaign.js lines 1726 and 1730 both route `/` through the guarded helper `window.location.href = (window.appUrl ? window.appUrl("/") : "/");`, which falls back to bare `/` rather than throwing if `app-base.js` has not loaded.

layout.js role-switch (line ~1846) prefixes only the destination and preserves the `returnUrl` build:

```js
const returnUrl = window.location.pathname + window.location.search + window.location.hash;
window.location.href = (window.appUrl ? window.appUrl('/Login') : '/Login')
    + '?returnUrl=' + encodeURIComponent(returnUrl);
```

`returnUrl` is the raw current pathname, which already includes `/crmweb` in production, so prefixing it would double the segment. Only `/Login` is prefixed; the raw returnUrl is `encodeURIComponent`'d as before.

### Sidebar hrefs prefixed without disturbing active-state detection

In `renderSidebarMenu()`, the children branch computes `const cHref = (window.appUrl && cPath !== '#') ? window.appUrl(cPath) : cPath;` and the leaf branch `const pHref = (window.appUrl && path !== '#') ? window.appUrl(path) : path;`; the templates use these for `href` only, while `isSidebarPathActive`/`getSidebarIcon` keep receiving the raw `cPath`/`path`. Those comparison functions match `window.location.pathname` (prefixed in production) against raw menu paths, so leaving them on raw paths is what keeps active-highlighting unchanged — prefixing the compared value would break it. The `'#'` and missing-`appUrl` guards leave placeholder anchors untouched and keep it a no-op at root.

### /Campain navigation origin

The user-reported `GET /Campain 504` is a sidebar-link navigation, not a `window.location` assignment. A sweep of the JS confirms every other `/Campain` reference is a `fetch(...)` call (prefixed by the existing fetch wrapper), a `window.open(..., '_blank')` to a new tab, or a string in an email body — none are same-tab navigations that would hit the proxy root. The sidebar link is now prefixed at render time and caught by the delegated listener, so it lands on `/crmweb/Campain`.

### Favicon: explicit link fixed, implicit root honestly flagged

`_Layout.cshtml` keeps `<link rel="icon" type="image/x-icon" href="~/favicon.ico" asp-append-version="true" />` and adds `<link rel="shortcut icon" href="~/favicon.ico" />`; Razor `~/` resolves to `/crmweb/favicon.ico`, so the explicit request is prefix-correct. The `@* ... *@` comment states plainly that the browser's implicit root `GET /favicon.ico` cannot be redirected from inside the app and gives the Nginx one-liner (`location = /favicon.ico { return 301 /crmweb/favicon.ico; }`). The markup is well-formed Razor. This is the honest framing the task required: the app change does not fully resolve the tab spinner on its own.

### Server routing and PathBase untouched; diff scope

Program.cs still declares `var pathBase = Environment.GetEnvironmentVariable("PathBase") ?? "/crmweb";`, the request-time middleware still prefers `X-Forwarded-Prefix` and falls back to `pathBase` while assigning `context.Request.PathBase`, and `app.UseRouting()` / `app.MapControllerRoute(...)` are present and unchanged (confirmed). The `Cookie.Path`/`SameSite` lines in `AddSession` belong to the earlier post-login-latency change, not this one, and are out of scope here. This change set is confined to `app-base.js`, `campaign.js`, `layout.js`, and `_Layout.cshtml`; no unrelated refactoring appears in the touched regions.

### Verification evidence

The implementer recorded `dotnet build "...\webCRM.csproj" -c Debug` with **Build succeeded, 0 Error(s), 0 Warning(s)** in `pathbase-nav-plan.md`. Because the edits are JS/CSHTML, the clean build confirms the Razor view still compiles; the JS behavior is not exercised by the C# compiler and was confirmed by reading the files. The build evidence is present and credible, so no re-run was performed. There is no test project in the repo and the task did not request adding one, so the build is the verification gate. Git is not available in this environment (`git` is not on PATH and the `.git` directory is at the repo root above the project), so this review was performed against the current on-disk file states cross-checked with the implementation plan rather than a `git diff`.

</details>

<details>
<summary>File map</summary>

- `wwwroot/js/app-base.js` — added `window.appNavigate` and a capture-phase delegated click listener after the empty-base guard; existing fetch/XHR/jQuery wrappers unchanged.
- `wwwroot/js/campaign.js` — home/back buttons (lines 1726, 1730) route `/` through guarded `window.appUrl`.
- `wwwroot/js/layout.js` — role-switch Login navigation prefixes only `/Login` (returnUrl build unchanged); sidebar render prefixes `href` via `cHref`/`pHref`, raw path still used for active/icon.
- `Views/Shared/_Layout.cshtml` — kept `~/favicon.ico` icon link, added `shortcut icon` link, documented the implicit-root favicon limitation and Nginx fallback.
- `Program.cs` — not changed by this task (PathBase middleware and routing confirmed intact).

Full diff unavailable (git not installed in this environment); review cross-checked current file states against `pathbase-nav-plan.md`.

</details>
