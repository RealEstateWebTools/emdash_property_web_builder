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

### 2b. Type Safety — DONE

- `astro.config.mjs` renamed to `astro.config.ts`; all references updated (`docs-validation.test.ts`, `locale.ts` comment)
- emdash patch comments already reference the upstream issues (OAuth CF env, InlinePortableTextEditor)

### 2c. Consolidate i18n — DONE

Added missing translation keys to `UI_TRANSLATIONS` (`'Thoughts, stories, and ideas.'`, `'RSS Feed'`, `'article'`, `'articles'`). Replaced two inline locale ternaries in `Base.astro` footer and one in `PostsIndexPage.astro` with `translateLabel()` calls. The translation tables remain in `locale.ts` as a pragmatic choice — splitting into per-locale files adds file count overhead with no functional gain at current scale.

---

## 3. Feature Improvements

### 3a. Breadcrumbs (emdash#414) — DONE

Upgraded to `emdash@0.2.0` (latest, includes breadcrumbs). Implemented on:

- Property detail: Home → Properties → [Property Title]
- Property index: Home → Properties for Sale/Rent
- Blog post: Home → Posts → [Post Title]
- Posts index: Home → Posts

`BaseLayout.astro` renders `<nav aria-label="Breadcrumb">` when `breadcrumbs` prop is non-empty.
`Base.astro` passes `breadcrumbs` to `createPublicPageContext` for plugin/SEO use (PR #414 API).
Patch `patches/emdash@0.2.0.patch` re-applies 4 fixes: OAuth CF env, InlinePortableTextEditor plugin-block-attrs, locale-aware RecentPosts widget.

### 3b. Sitemap — DONE

emdash 0.2.0 provides built-in `/sitemap.xml` (index), `/sitemap-[collection].xml` (per-collection), and `/robots.txt` routes — all registered automatically by the integration.

Added `src/pages/sitemap-properties.xml.ts` to cover PWB property listings (fetches up to 1000 properties via `searchProperties`, capped at 10 pages). Fails gracefully (empty sitemap) if PWB API is unavailable.

### 3c. Property Alert Sign-ups — DONE

Removed `property-alerts` section from `seed.json`. The PWB client has no alert subscription endpoint, and no page component was rendering the section. Keeping unused seed data implying unimplemented functionality is misleading. The `free-valuation` section is retained (it maps conceptually to the homepage CTA banner).

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
| 8 | Upgrade emdash 0.2.0 + breadcrumbs | Medium | Medium | **Done** |
| 9 | Component logic extraction + tests | Medium | Medium | **Done** |
| 10 | Sitemap | Low | Low | **Done** |
| 11 | Property alert CTA (wire or remove) | Low | Low | **Done** |
| 12 | i18n consolidation | Low | High | **Done** |
| 13 | astro.config.mjs → .ts | Low | Low | **Done** |

## Bugs Fixed During Plan Execution

- `astro.config.mjs` was missing `'fr'` from `i18n.locales` (French locale supported in code but not wired in Astro config)
- `PostPage.astro` was not using `translateBrand` for the blog site title (convention test failure)
- `PropertyIndexPage.astro` was missing the `fallbackSite` resilience pattern (no try/catch on PWB API calls)
