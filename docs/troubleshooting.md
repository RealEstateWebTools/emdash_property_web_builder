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

## EmDash admin shows a blank page after login

Usually a stale service worker. In Chrome DevTools → Application → Service Workers → click "Unregister", then hard-refresh.

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
