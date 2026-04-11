# Troubleshooting

## Seeded content doesn't appear in the admin

**Symptom:** You run `npx emdash seed seed/seed.json`, it reports success, but the new entries don't show up in `/_emdash/admin`.

**Cause:** The dev server was started with `pnpm astro dev` (or similar) instead of `npx emdash dev`, OR you were previously using the Cloudflare adapter in dev which reads from Wrangler's D1 emulation (`.wrangler/state/v3/d1/`) instead of `data.db`.

**Fix:**
1. Make sure `astro.config.mjs` is using the SQLite adapter in dev (it should be — check that `isDev = process.env.NODE_ENV !== 'production'`).
2. Use `npx emdash dev` to start the server (not `pnpm dev`).
3. Hard-refresh the admin (`Cmd+Shift+R`).

To verify what's actually in the database:
```bash
sqlite3 data.db "SELECT slug, status, title FROM ec_pages;"
```

---

## Admin shows only the manually created page, not seeded ones

Same as above — you were previously using the Cloudflare D1 emulation. The manually created page is in `.wrangler/state/v3/d1/...sqlite` and the seeded content is in `data.db`.

Once you switch to SQLite-in-dev mode, the manually created page won't appear (it's in the Wrangler DB). Either:
- Recreate it manually in the admin (it will go into `data.db` this time)
- Or add it to `seed/seed.json` so it's reproducible

---

## `PWB_API_URL` is not set error

**Symptom:** Page throws `Error: PWB_API_URL environment variable is not set`.

**Fix:** Copy `.env.example` to `.env` and set the URL:
```bash
cp .env.example .env
# Edit .env: PWB_API_URL=http://localhost:3000
```

---

## Tests fail with "Cannot find module" after changing client.ts

If you change the API paths in `client.ts`, update the MSW mock paths in `src/test/mocks/pwb-server.ts` to match. The mock uses the same URL patterns that `PwbClient` builds.

---

## Astro types error: `Cannot find module 'astro:content'`

Run `npx emdash dev` once to generate types, then the TypeScript errors should clear. The `emdash-env.d.ts` file is auto-generated on dev server start.

---

## Property page shows blank / redirects to 404

**Possible causes:**
1. `PWB_API_URL` is pointing at an instance that doesn't have the property
2. The PWB backend isn't running
3. The slug in the URL doesn't match any property in PWB

Check the browser console and the Astro dev server terminal for the actual HTTP error.

---

## Contact form submissions fail silently

The form reads the PWB API URL from a `<meta name="pwb-api-url">` tag in `BaseLayout.astro`. If `PWB_API_URL` is not set in the environment at build time, the meta tag will be empty and fetch calls will go to `undefined/api_public/v1/enquiries`.

Check: `document.querySelector('meta[name="pwb-api-url"]').content` in the browser console.

---

## EmDash admin login succeeds but immediately redirects back to the login page

**Symptom:** Passkey verification returns 200 but the next request gets a 401, and the server logs show:
```
[WARN] [session] context.session was used … but no storage configuration was provided
```

**Cause:** No session driver is configured. Without the Cloudflare adapter (which provides session storage in production), Astro can't persist the session between requests.

**Fix:** `astro.config.mjs` must include a dev-only session driver:
```js
...(isDev ? { session: { driver: "fs-lite" } } : {}),
```
This is already set. If the warning reappears, check that `isDev` resolves to `true` (i.e. `NODE_ENV` is not `"production"`).

---

## EmDash admin shows "Invalid hook call" / blank white screen

**Symptom:** Browser console shows:
```
Invalid hook call. Hooks can only be called inside of the body of a function component.
```

**Cause:** Two copies of React are loaded — one pre-bundled by Vite, one inlined inside the `@emdash-cms/admin` chunk.

**Fix:** `@emdash-cms/admin` must be in `vite.optimizeDeps.exclude` in `astro.config.mjs` so Vite doesn't pre-bundle it (which would inline React). This is already set. If the error returns after a package update, check that the exclude entry is still present.

---

## EmDash admin shows a blank page after login

Usually a stale service worker. In Chrome DevTools → Application → Service Workers → click "Unregister", then hard-refresh.

---

## `npx emdash login --url <workers.dev>` prints `undefined` and times out

**Symptom:** Remote login reports a successful connection, then shows `undefined` for the browser URL and device code, and exits with `Device code expired (timeout)`.

**What this means:** The deployed site can still be healthy. During verification, the browser admin login page loaded correctly and offered Passkey, GitHub, Google, and email-link sign-in. The failure appears to be in the CLI device-code path for this deployment, not in the deployed admin itself.

**Workaround:**
1. Use the browser login at `/_emdash/admin/login` to confirm the site auth flow is healthy.
2. Prefer an MCP client that supports browser OAuth when connecting to `/_emdash/api/mcp`.
3. If you need remote writes immediately, use the admin UI or a browser-authenticated MCP client rather than blocking on the CLI device flow.

**Context:** The deployed MCP endpoint is OAuth-protected and advertises a standard authorization server, so this symptom should not be interpreted as "MCP is not deployed" or "admin auth is broken".

---

## Passkey login fails in dev-browser / Playwright sessions

**Symptom:** The admin login page loads correctly but clicking "Sign in with Passkey" does nothing or fails to authenticate.

**Cause:** The dev-browser skill (and any Playwright-managed browser) runs an isolated browser profile that has no access to the user's system passkeys or saved credentials.

**Fix:** Use `mcp__claude-in-chrome` tools instead. These connect to the user's real Chrome instance where passkeys are registered. Navigate to `/_emdash/admin/login` in the real browser and complete the passkey prompt there.

---

## Email link login returns "Email is not configured"

**Symptom:** Clicking "Sign in with email link" and submitting an email address shows: `Email is not configured. Magic link authentication requires an email provider.`

**Cause:** The production deployment does not have an email provider configured, so magic link auth is unavailable.

**Fix:** Use Passkey, GitHub, or Google login instead. For automated sessions, use `mcp__claude-in-chrome` to authenticate via passkey in the user's real Chrome browser.

---

## Production passkey login fails with `Credential not found`

**Symptom:** Worker logs show:

```text
[PASSKEY_VERIFY_ERROR] Error: Credential not found
```

and there is no alternate sign-in path available.

**Cause:** The deployed database no longer has a passkey row that matches the browser credential being presented. In passkey mode, EmDash can also get stuck with `emdash:setup_complete = true`, which prevents the first-admin setup flow from reopening automatically.

**Fix:** Use the repo recovery command:

```bash
pnpm reset:admin-access
```

That will:

- back up the remote auth/setup tables
- clear remote auth and passkey rows, including deleting all rows from `users`
- reset `emdash:setup_complete` to `false`
- preserve content

Then reopen setup:

- [https://emdash-property-web-builder.etewiah.workers.dev/_emdash/admin/setup](https://emdash-property-web-builder.etewiah.workers.dev/_emdash/admin/setup)

and register a new admin passkey.

This recovery flow preserves CMS content, but it does remove all existing user accounts from the target D1 database.

If you want to inspect the plan first:

```bash
pnpm reset:admin-access --dry-run
```

For the full scripted workflow and exact table list, see:

- [docs/admin-access-recovery.md](docs/admin-access-recovery.md)

---

## Admin API mutations return 403 CSRF_REJECTED

**Symptom:** Direct `fetch()` calls to `/_emdash/api/content/*` with POST/PUT/PATCH return `{"error":{"code":"CSRF_REJECTED","message":"Missing required header"}}`.

**Cause:** The EmDash `csrfInterceptor` requires the custom header `X-EmDash-Request: 1` on all mutating requests. The admin UI's bundled fetch client adds this automatically; direct fetch calls do not.

**Fix:** Add `'X-EmDash-Request': '1'` to the headers of every POST, PUT, PATCH, or DELETE request:

```js
fetch('/_emdash/api/content/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-EmDash-Request': '1' },
  body: JSON.stringify({ ... })
})
```

---

## Not-found routes loop on `/404` or log HTTP 521 when the PWB backend is unreachable

**Symptom:** The custom domain can get stuck redirecting to `/404`, and Worker logs may show repeated backend errors such as:

```
Error: HTTP 521 https://demo.propertywebbuilder.com/api_public/v1/en/site_details
  at PwbClient.get (chunks/client_BNBH10g4.mjs:80:13)
  at async chunks/404_D01OZCcY.mjs:8:16
```

HTTP 521 means Cloudflare cannot reach the origin server (PWB backend is down or refusing connections).

**Cause:** The main problem was redirect-based not-found handling. Several routes used `Astro.redirect('/404')` when content was missing. On the custom domain, that can create a `/404` redirect loop instead of terminating in a real 404 response. Some of those routes also fetched PWB site data before deciding whether to render a not-found page, which added noisy `site_details` errors whenever the backend was unavailable.

**Fix:** Return a direct 404 response from the failing route instead of redirecting to `/404`. For property-layout pages, use a minimal fallback `SiteDetails` object so the page can still render when the PWB backend is down. The dedicated `src/pages/404.astro` page should also avoid calling the PWB backend.

---

## OAuth login fails with "Astro.locals.runtime.env has been removed in Astro v6"

**Symptom:** Worker logs show:
```
OAuth initiation error: Error: Astro.locals.runtime.env has been removed in Astro v6. Use 'import { env } from "cloudflare:workers"' instead.
```
Clicking "Sign in with GitHub" or "Sign in with Google" redirects back to the login page with `?error=oauth_error`.

**Cause:** The emdash OAuth routes used `locals.runtime?.env` to read Cloudflare environment bindings (OAuth client ID/secret). Astro v6 removed `locals.runtime` entirely — accessing it now throws instead of returning `undefined`.

**Fix:** The emdash package is patched in `patches/emdash@0.1.0.patch` to use `import("cloudflare:workers")` in Cloudflare Workers, with a fallback to `import.meta.env` for local dev. Both `[provider].ts` and `[provider]/callback.ts` are patched.

If this error reappears after upgrading emdash, re-apply the patch:
1. Open a fresh patch edit dir: `pnpm patch emdash@<new-version>`
2. In both `src/astro/routes/api/auth/oauth/[provider].ts` and `.../callback.ts`, replace the `runtimeLocals.runtime?.env` block with:
   ```typescript
   let env: Record<string, unknown>;
   try {
     const cf = await import("cloudflare:workers");
     env = cf.env as Record<string, unknown>;
   } catch {
     env = import.meta.env as Record<string, unknown>;
   }
   ```
3. Commit the patch: `pnpm patch-commit node_modules/.pnpm_patches/emdash@<new-version>`
4. Redeploy: `pnpm run deploy:prod`

Regression tests in `src/emdash-oauth-patch.test.ts` will catch if the fix is ever dropped.

---

## Custom domain on `propertywebbuilder.com` returns a blank white page (HTTP 200, empty body)

**Symptom:** A custom domain or route on `propertywebbuilder.com` (e.g. `emdash2.propertywebbuilder.com`) returns HTTP 200 with an empty body. Worker observability logs show HTTP 521 errors for every call to `demo.propertywebbuilder.com`, even though `curl https://demo.propertywebbuilder.com/` works fine from outside Cloudflare. A custom domain on a different zone (e.g. `emdash.homestocompare.com`) works correctly with the same Worker and the same `PWB_API_URL`.

**Cause — Cloudflare same-zone subrequest restriction.** When the Worker handles a request arriving via the `propertywebbuilder.com` zone, any outbound `fetch()` to another hostname that also lives in that zone (including grey-cloud / DNS-only records) is subject to Cloudflare's internal routing for that zone. Cloudflare cannot forward those subrequests to the origin and returns HTTP 521 ("Web Server Down"). When the same Worker handles a request arriving via a different zone (`homestocompare.com`), the subrequest to `demo.propertywebbuilder.com` crosses zone boundaries and reaches the origin normally.

The same failure applies to both mechanisms Cloudflare uses for Worker binding on `propertywebbuilder.com`:
- **Route** (`emdash.propertywebbuilder.com/*`) — all fetch calls to `demo.propertywebbuilder.com` return 521.
- **Custom domain** (`emdash2.propertywebbuilder.com`) — same result.

**Diagnosis:** In the Worker's Observability → Events view, filter by `emdash2` (or the failing domain). Every invocation will show:
```
[pwb] GET https://demo.propertywebbuilder.com/api_public/v1/en/site_details
HTTP 521 https://demo.propertywebbuilder.com/api_public/v1/en/properties?...
```
The invocation itself is marked as an error even though the browser receives HTTP 200 with an empty body (the Worker catches the 521 and returns an empty response rather than crashing).

**Fix options (choose one):**

1. **Use a `PWB_API_URL` on a different zone.** Set `PWB_API_URL` to a hostname that is *not* in the `propertywebbuilder.com` Cloudflare zone — for example, the server's IP address, or an alias record managed under `homestocompare.com` or another zone you control.

2. **Delete the `demo` DNS record from the Cloudflare zone.** If `demo.propertywebbuilder.com` has a DNS record in the `propertywebbuilder.com` Cloudflare zone (even grey-cloud / DNS-only), Cloudflare still routes Worker subrequests through the zone. Removing the record from Cloudflare and managing DNS for it elsewhere (or via the server's IP) allows subrequests to reach the origin directly.

3. **Add the `cf-no-worker` header to API subrequests.** Passing `'cf-no-worker': '1'` on the outbound fetch instructs Cloudflare to skip Worker processing for that subrequest, which can also break the loopback. This requires modifying the `PwbClient` fetch calls.

---

## Deploy-to-Workers form shows two `PWB_API_URL` fields

**Symptom:** When deploying via the Cloudflare "Deploy to Workers" button, the configuration form shows `PWB_API_URL` twice — one field pre-filled with dots (masked) and one empty field.

**Cause:** `PWB_API_URL` has been set both as a **Worker secret** (via `wrangler secret put PWB_API_URL` at some point) and as a plain **var** in `wrangler.jsonc` (`"vars": { "PWB_API_URL": "" }`). The deploy form renders one field for each. Secrets take precedence over vars at runtime, so the Worker uses the secret value.

**Fix:** Since `PWB_API_URL` is not sensitive and should be visible and easy to change, delete the secret version:
```bash
wrangler secret delete PWB_API_URL
```
After that the form shows only the single plain-text `vars` field from `wrangler.jsonc`.

---

## `better-sqlite3` fails to install

If `pnpm install` fails on `better-sqlite3`, the native bindings need to be compiled:
```bash
pnpm approve-builds
# Select: better-sqlite3
pnpm install
```

If you're on Apple Silicon and get an architecture mismatch, try:
```bash
arch -arm64 pnpm install
```
