# Technical Decisions

A log of non-obvious choices made during development, and why.

---

## SQLite for local dev, D1 for production

**Decision:** `astro.config.mjs` switches database/storage based on `NODE_ENV`.

**Why:** `npx emdash seed` writes to a local SQLite file (`data.db`). It cannot write to Wrangler's local D1 emulation. Using the Cloudflare adapter in dev causes the seed tool and the dev server to read from different databases — seeded content never appears in the admin.

Using SQLite locally keeps the seed tool and the dev server pointed at the same file.

---

## All PWB API calls go through `PwbClient`

**Decision:** No raw `fetch()` calls to PWB outside of `src/lib/pwb/client.ts`.

**Why:** Centralising all fetch calls makes it easy to mock them in tests (MSW intercepts at the network layer, not per-file), add caching later, change the API base URL, or swap the backend. Every Astro page calls `createPwbClient()` and gets the same tested interface.

---

## MSW for API tests, not per-function mocks

**Decision:** Tests use [Mock Service Worker](https://mswjs.io/) to intercept HTTP calls, not Jest/Vitest function mocks on `fetch`.

**Why:** Function mocks test that your code calls the right function with the right arguments — they don't test the URL, headers, or response parsing. MSW tests the full HTTP roundtrip at the network layer, which means a test failure actually means something broke, not just that the call signature changed.

---

## EmDash for copy, PWB for property data

**Decision:** EmDash only stores site copy (hero headlines, CMS pages). Property data is never duplicated into EmDash.

**Why:** PWB is the authoritative source for property data and already has the full data model (prices, photos, search facets). Duplicating it into EmDash would mean keeping two systems in sync. The hybrid approach keeps each system doing what it does best.

---

## `[...slug].astro` catch-all for CMS pages

**Decision:** A single catch-all route handles all CMS pages fetched from PWB's `/localized_page/by_slug/:slug` endpoint.

**Why:** CMS page slugs are managed in PWB — the Astro site doesn't know them in advance. A catch-all route handles any slug, redirecting to 404 if PWB returns an error. This means new CMS pages created in PWB are immediately available on the Astro frontend without a code deploy.

**Important:** This route is defined in `src/pages/[...slug].astro`, which has lower precedence than explicit routes. `/properties/...` and `/index` are matched first.

---

## Localized API paths (`/api_public/v1/:locale/...`)

**Decision:** The `PwbClient` uses a `localizedApiBase` (`/api_public/v1/:locale/`) for all data endpoints.

**Why:** PWB returns locale-aware content (translated titles, descriptions, formatted prices) when a locale prefix is provided. Hardcoding `/api_public/v1/` would always return the default locale. The locale is passed to `createPwbClient(locale)` so pages can pass the visitor's locale through.

---

## No Tailwind, CSS custom properties only

**Decision:** All styling uses CSS custom properties defined in `public/styles/theme.css`. No Tailwind, no Bootstrap, no CSS-in-JS.

**Why:** The site needs to support **palette swapping** — PWB has a theming system where agencies can pick from 10 color palettes. CSS custom property overrides in `public/styles/palettes/<name>.css` implement this trivially. A utility-class system like Tailwind would require regenerating classes per palette.

---

## `set:html` for PWB page content

**Decision:** CMS page content from PWB is rendered with Astro's `set:html` directive.

**Why:** PWB returns pre-rendered HTML for `page_contents` blocks. The HTML is generated server-side by the trusted PWB Rails backend (Liquid templates, sanitised). Treating it as raw HTML is correct here.

**Security note:** `set:html` bypasses Astro's XSS protection. This is safe only because the HTML comes from the PWB backend you control. Never pass user-submitted content through `set:html`.
