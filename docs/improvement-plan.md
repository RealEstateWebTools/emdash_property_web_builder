# Project Improvement Plan

Generated: 2026-04-12

This document captures the full improvement plan for `emdash_property_web_builder`, covering test coverage expansion, code quality, feature work, and infrastructure.

---

## Current State Summary

### Strengths
- Strong utility/helper testing (validators, formatters, locale, theme, email, DB sync)
- Comprehensive route guard/convention testing
- Good separation of concerns (components, layouts, lib, plugins)
- Theme system with 7 palettes and multiple customisation axes
- Full i18n support (en/es/fr) with fallbacks

### Weaknesses
- **Zero component unit tests** — 22 Astro component files untested
- **Zero page/route integration tests** — 23 page files untested
- **No form testing** — SearchBar, ContactForm, enquiry validation flow untested end-to-end
- **No E2E tests** — no Playwright tests at all (CLAUDE.md mandates Playwright)
- **No CI pipeline** — no `.github/workflows/`
- **No coverage thresholds** — coverage baseline unknown

---

## 1. Test Coverage Expansion

### 1a. Form Flow Tests (Quick Win)

**Files:** extend `src/lib/pwb/enquiry-validator.test.ts`, new `src/lib/pwb/search-params.test.ts`

- `ContactForm` field-level error display: empty name, bad email format, short message
- Search filter round-trip: build params → parse params → same values
- Enquiry submission: success path (MSW 200), failure path (MSW 422), network error

### 1b. Error Handling / Resilience Tests (Quick Win)

**Files:** extend `src/lib/pwb/client.test.ts`, new `src/pages/*.test.ts`

- PWB client timeout → page renders graceful fallback
- PWB returns 500 → verify error is caught, not unhandled
- EmDash query for deleted entry → `[slug].astro` returns 404, not crash
- Missing `PWB_API_URL` env var → clear error message at startup

### 1c. Route Integration Tests

**Files:** `src/pages/properties.test.ts`, `src/pages/posts.test.ts`, `src/pages/search.test.ts`

- `properties/[slug].astro` — 404 when PWB returns 404; property data passed to component
- `posts/[slug].astro` — 404 for draft/missing entries; correct entry loaded by slug
- `search.astro` — query params forwarded to `searchProperties()`; empty results renders gracefully
- `[lang]/rss.xml.ts` — correct `Content-Type`; locale in feed; filters unpublished

### 1d. Component Logic Tests

Extract non-trivial logic from Astro components into `src/lib/` helpers (following the existing pattern), then test:

- `PropertyCard` — missing image fallback, featured badge logic, price formatting
- `PostCard` — excerpt truncation, date formatting, category link building
- `SiteHeader` — active nav link detection, language switcher locale list
- `TranslationLinks` — hreflang tag generation for all locales

### 1e. PWB Page Parts Plugin Tests

The `pwb-page-parts` workspace plugin has no tests. Establish baseline:

- Hook registrations exist and are callable
- Block type definitions export expected fields
- i18n strings present for all supported locales (en/es/fr)

### 1f. E2E Tests with Playwright

Add `playwright.config.ts` targeting `http://localhost:4321`. Three golden-path flows:

| Flow | Assertions |
|---|---|
| Property search → detail | Search renders results; card link loads detail with correct title/price |
| Blog listing → post | Post card links work; post page shows title, content, category breadcrumb |
| Contact form submission | Inline validation shows errors; success/error message shown after submit |

---

## 2. Code Quality

### 2a. Extract Logic from Astro Components

Audit `PropertyDetailPage.astro`, `PropertyIndexPage.astro`, `SearchPage.astro` for inline logic. Move to `src/lib/pwb/` where testable. Ensure all pages use `buildPageMeta()` from `site-config.ts` for meta tags.

### 2b. Type Safety

- Migrate `astro.config.mjs` → `astro.config.ts` for type checking
- Document each `as unknown as` cast in the emdash patch with a comment explaining safety + which upstream PR will resolve it

### 2c. Consolidate i18n

Current `translateLabel` / `translateBrand` ad-hoc objects in `locale.ts` will not scale. Plan:

- Create `src/lib/i18n/` module with one file per locale (`en.ts`, `es.ts`, `fr.ts`)
- Namespace by domain: `ui`, `brand`, `meta`
- Existing tests make this a safe refactor

---

## 3. Feature Improvements

### 3a. Breadcrumbs (emdash#414)

Upgrade to `emdash@0.1.1` (merged 2026-04-11). Implement breadcrumbs on:

- Property detail: Home → Properties → [Property Title]
- Blog post: Home → Blog → [Category] → [Post Title]
- CMS page: Home → [Page Title]
- Category/tag pages: Home → Blog → [Category Name]
- Homepage, search, 404: pass `breadcrumbs: []` (explicit opt-out)

Benefits: JSON-LD structured data for SEO, visual breadcrumb component.

**Before upgrading:** verify the existing `patches/emdash@0.1.0.patch` — check which hunks are now upstream in 0.1.1 and drop them. Document any remaining hunks.

### 3b. Sitemap

No sitemap exists. Add `@astrojs/sitemap` wired to:
- EmDash collection URLs (posts, pages)
- Property URLs from PWB API

Add `public/robots.txt` referencing `sitemap-index.xml`. Add a docs-validation test that verifies the reference exists.

### 3c. Property Alert Sign-ups

The seed file defines a `property-alerts` section/CTA but there is no form or backend for it. Either:
- Wire to PWB API's alert subscription endpoint, or
- Remove the CTA to avoid dead UI

---

## 4. Infrastructure & Tooling

### 4a. CI Pipeline

Add `.github/workflows/ci.yml`:

```
lint → typecheck (astro check) → test:run → playwright
```

- Gate PRs on all four steps
- Use Wrangler local dev mode for Playwright (no live Cloudflare needed)
- Cache `node_modules` and `.pnpm-store`

### 4b. Coverage Thresholds

1. Run `pnpm test:coverage` to establish baseline
2. Set thresholds 5% below baseline in `vitest.config` or `package.json`:

```json
"coverage": {
  "thresholds": { "lines": 70, "functions": 70 }
}
```

3. Ratchet upward as new tests are added

### 4c. emdash Patch Documentation

Each hunk in `patches/emdash@0.1.0.patch` should be documented:

| Hunk | What it fixes | Upstream issue/PR | Fixed in version |
|---|---|---|---|
| CLI login scope | Adds `scope: "admin"` to device code request | — | TBD |
| CLI device code response | Unwraps `.data` from response | — | TBD |
| OAuth callback CF env | Replaces `locals.runtime.env` with `cloudflare:workers` import | Astro v6 breaking change | TBD |

---

## Priority Order

| # | Item | Impact | Effort | Status |
|---|---|---|---|---|
| 1 | Form flow tests | High | Low | **Done** |
| 2 | Error handling / resilience tests | High | Low | **Done** |
| 3 | Coverage thresholds (baseline 78.4%) | Low | Low | **Done** |
| 4 | Route integration tests | High | Medium | **Done** |
| 5 | PWB page parts plugin test baseline | Medium | Low | **Done** (pre-existing) |
| 6 | E2E Playwright setup | High | Medium | **Done** |
| 7 | CI pipeline | High | Medium | **Done** |
| 8 | Upgrade emdash 0.1.1 + breadcrumbs | Medium | Medium | Pending |
| 9 | Component logic extraction + tests | Medium | Medium | Pending |
| 10 | Sitemap | Low | Low | Pending |
| 11 | Property alert CTA (wire or remove) | Low | Low | Pending |
| 12 | i18n consolidation | Low | High | Pending |
| 13 | astro.config.mjs → .ts | Low | Low | Pending |

## Bugs Fixed During Plan Execution

- `astro.config.mjs` was missing `'fr'` from `i18n.locales` (French locale supported in code but not wired in Astro config)
- `PostPage.astro` was not using `translateBrand` for the blog site title (convention test failure)
- `PropertyIndexPage.astro` was missing the `fallbackSite` resilience pattern (no try/catch on PWB API calls)
