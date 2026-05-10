# Project Review — emdash_property_web_builder

**Date:** 2026-05-03
**Reviewer:** Claude (Opus 4.7)
**Scope:** Full read-only review of the Astro/EmDash/Cloudflare Worker project at
`emdash_property_web_builder/`. Covers architecture, configuration, routing,
components, plugins (in-repo + workspace), tests, CI, deployment, security,
i18n, and code quality.

This is an exploratory review document. File/line references are pinned to the
state of the tree at HEAD `378eb40` ("Implement 0.5.0 feature plans: MCP
config, sitemaps, repeater fields"). They will drift as the code evolves.

---

## 1. Executive summary

The project is a well-structured hybrid of two CMSs:

- **EmDash** (own admin UI, SQLite locally / Cloudflare D1 in production) for
  editorial content (pages, blog posts, menus, widgets, taxonomies) and admin
  plugins.
- **Property Web Builder (PWB)** (Rails JSON API at `PWB_API_URL`) for property
  listings, search, enquiries, and CMS-rendered "page parts."

It deploys as a single **Cloudflare Worker** (`wrangler deploy`) backed by D1
+ R2 + KV. Local dev uses `better-sqlite3` and a local `uploads/` directory.
The repo bundles four pnpm workspace plugins (`pwb-properties`,
`pwb-page-parts`, `pwb-property-embeds`, `pwb-valuation`) plus three
site-local plugins (`pwb-theme`, `site-profile`, `resend-email`).

Overall: the codebase is mature, has real test coverage, separates concerns
cleanly, and shows good operational discipline (public-template wrangler
config, gitignored prod config, secrets rules in `AGENTS.md`,
docs-validation tests). The biggest structural weakness is **two parallel
layouts/design systems** that must be kept in sync. The biggest correctness
weakness is **silent error swallowing** that masks PWB outages as 404s.
Nothing in the review is a critical security flaw, but a JSON-LD escaping bug
and noisy production logging deserve quick fixes.

---

## 2. What the project is

### 2.1 Stack

- **Framework:** Astro 6.1.2 (`output: "server"`)
- **Runtime (prod):** Cloudflare Workers (`@astrojs/cloudflare` 13.1.6)
- **Runtime (dev):** plain Node, `better-sqlite3` for the local DB
- **CMS:** `emdash` 0.5.0 (with local patch `patches/emdash@0.5.0.patch`)
- **Database (prod):** Cloudflare D1; **(dev):** SQLite at `./data.db`
- **Storage (prod):** Cloudflare R2; **(dev):** filesystem at `./uploads`
- **Sessions (prod):** Cloudflare adapter; **(dev):** in-memory
- **UI:** React 19 (admin only), plain Astro components for public pages
- **Tests:** Vitest 4 + happy-dom + MSW; Playwright 1.59 for e2e
- **Package manager:** pnpm 10 (workspace), Node 22 in CI
- **Mapping:** Leaflet 1.9.4

### 2.2 Top-level layout

```
astro.config.ts            — emdash() integration, dev/prod adapters, Vite tweaks
src/worker.ts              — Cloudflare entrypoint (re-exports adapter handler)
src/live.config.ts         — EmDash live collections boilerplate
src/pages/                 — Astro routes (server-rendered)
src/components/pages/      — Page-level Astro components called from src/pages/
src/components/            — Shared UI (cards, forms, header, footer, gallery…)
src/lib/                   — Domain logic (locale, pwb client, formatters,
                              homepage merchandising, site profile, etc.)
src/plugins/               — Site-local EmDash plugins
   pwb-theme.ts/.sandbox.ts
   site-profile.ts/.sandbox.ts
   resend-email.ts/.sandbox.ts
src/layouts/               — Base.astro (EmDash-flavoured), BaseLayout.astro
                              (PWB-flavoured)
packages/plugins/          — Workspace plugin packages
seed/                      — seed.json (~46 KB), seed/profiles/full|minimal|pre-launch
scripts/                   — dev, seed, reset, export-sqlite-for-d1,
                              push-local-db-to-d1, reset-admin-access
patches/                   — emdash@{0.1,0.2,0.5}.patch
docs/                      — 27+ markdown docs (architecture, plans, plugin notes)
e2e/                       — Playwright specs (6 files)
.github/workflows/ci.yml   — typecheck + coverage + Playwright
wrangler.jsonc             — public template (no real IDs)
wrangler.prod.jsonc        — gitignored, real prod config
wrangler.prod.jsonc.example — checked-in template
```

### 2.3 Routes

Public routes (server-rendered):

| Route                          | Source file                                 | Purpose                       |
| ------------------------------ | ------------------------------------------- | ----------------------------- |
| `/`                            | `src/pages/index.astro` → `IndexPage.astro` | Homepage                      |
| `/posts`, `/posts/[slug]`      | `src/pages/posts/...`                       | Blog index + posts            |
| `/properties`                  | `src/pages/properties/index.astro`          | Search results / map          |
| `/properties/[slug]`           | `src/pages/properties/[slug].astro`         | Property detail               |
| `/pages/[slug]`                | `src/pages/pages/[slug].astro`              | EmDash CMS pages              |
| `/category/[slug]`             | `src/pages/category/...`                    | Blog category                 |
| `/tag/[slug]`                  | `src/pages/tag/...`                         | Blog tag                      |
| `/search`                      | `src/pages/search.astro`                    | Blog search                   |
| `/[lang]/...`                  | `src/pages/[lang]/...`                      | Localised mirrors of above    |
| `/[...slug]`                   | `src/pages/[...slug].astro`                 | PWB CMS page catch-all        |
| `/api/enquiries`               | `src/pages/api/enquiries.ts`                | Enquiry POST proxy → PWB      |
| `/sitemap.xml`                 | `src/pages/sitemap.xml.ts`                  | Sitemap index                 |
| `/sitemap-properties.xml`      | `src/pages/sitemap-properties.xml.ts`       | Properties sitemap            |
| `/rss.xml`, `/[lang]/rss.xml`  | `src/pages/rss.xml.ts`                      | Blog RSS                      |
| `/robots.txt`                  | `src/pages/robots.txt.ts`                   | Robots                        |
| `/_emdash/admin`               | (handled by emdash integration)             | Admin UI                      |
| `/_emdash/api/mcp`             | (handled by emdash integration)             | EmDash MCP endpoint           |
| `/valuation`                   | injected by `pwbValuationIntegration()`     | Valuation form                |

i18n in `astro.config.ts`:

- `defaultLocale: 'en'`, `locales: ['en', 'es', 'fr']`,
  `prefixDefaultLocale: false`, fallbacks `es → en`, `fr → en`.
- Locale validation done in `src/lib/route-locale.ts` and
  `src/lib/locale.ts:validateLocale`. URLs of arbitrary `/foo/bar` shape match
  the `[lang]` route, so the validator returns `null` and the route sets a 404
  status — correct.

---

## 3. Strengths

- **Clean concern split.** Editorial content (EmDash) and listings (PWB) each
  stay in their lane. The README documents the split explicitly.
- **Public/private wrangler split** (`wrangler.jsonc` is a banner-marked public
  template; real IDs in gitignored `wrangler.prod.jsonc`). The user's saved
  memory captures this rule.
- **Real test coverage.** 34 vitest test files + 6 Playwright e2e specs. MSW
  is used to mock the PWB API in `src/test/mocks/pwb-server.ts` with JSON
  fixtures in `src/test/fixtures/`. 80% coverage thresholds in
  `vitest.config.ts`.
- **Doc-validation test.** `src/docs-validation.test.ts` parses every
  `pnpm <script>` reference in `docs/*.md` and fails if it's not in
  `package.json`. Also rejects Cloudflare Pages deploy commands (this project is a
  Worker, not Pages). This is an exemplary guardrail.
- **CI workflow** (`.github/workflows/ci.yml`):
  - typecheck + unit tests with coverage on every push/PR
  - Playwright e2e gated on `vars.RUN_E2E == 'true'` or push events so fork
    PRs don't fail on missing secrets
  - Seeds the DB before e2e (`pnpm seed:minimal`)
  - Uploads Playwright reports as artifacts
- **Patch-package workflow** for upstream EmDash. `pnpm.patchedDependencies`
  in `package.json` references `patches/emdash@0.5.0.patch`; older patches are
  retained for history. Documented in
  `docs/emdash-plugin-block-attr-patch.md`.
- **Server-rendered everywhere** with breadcrumbs, JSON-LD,
  `Astro.cache.set(cacheHint)` calls, `hreflang` alternate links, sitemap
  index + sub-sitemaps, RSS feed, robots.txt.
- **Graceful degradation:**
  - `src/lib/pwb/fallback-site.ts` keeps the site rendering if PWB returns a
    bad shape.
  - `src/pages/404.astro:6` deliberately doesn't call PWB — keeps Worker logs
    clean on garbage URLs.
- **Plugin architecture is well-factored.** Sandbox-mode plugins declare
  capabilities (`network:fetch:any`) and `allowedHosts` (e.g. resend-email
  pinned to `api.resend.com`). The pwb-valuation integration uses
  `injectRoute` + Vite virtual modules to ship a route into the host without
  forcing the host to write a page file (`packages/plugins/pwb-valuation/src/integration.js`).
- **Three seed profiles** (`full`, `minimal`, `pre-launch`) give content
  authors a meaningful demo, a fast test seed, and a coming-soon
  configuration.
- **Documentation breadth.** 27+ markdown files in `docs/` covering
  architecture, decisions, hosting, plugin plans, troubleshooting, an
  improvement roadmap, an execution plan, and an i18n plan.

---

## 4. Findings (organised by theme)

### 4.1 Architecture / structure

#### F-1. Two parallel layouts and design systems  *(High impact)*

`src/layouts/Base.astro` (1009 lines, used by EmDash blog/page templates) and
`src/layouts/BaseLayout.astro` (258 lines, used by PWB-driven property
pages) define **separate `<html>` roots, separate `<head>`, separate
header/footer, and disjoint CSS-variable namespaces** (`--color-bg` /
`--font-sans` in `Base.astro` vs `--color-primary` / `--font-serif` in
`BaseLayout.astro`).

Switching between a blog post and a property page is effectively switching
sites. Each component has its own local stylesheet block; design tokens are
duplicated. This is the single biggest source of duplication, drift risk, and
maintenance burden, and it explains why theming is split across two
mechanisms.

**Recommendation:** Plan a multi-day consolidation. Pick a single layout that
both content surfaces import. Extract `<head>` and chrome into smaller
components. Adopt one design-token namespace.

#### F-2. PWB catch-all route is too greedy  *(Medium)*

`src/pages/[...slug].astro` matches any URL not handled by another route and
calls PWB's `getPageBySlug`. If PWB returns 404 it renders 404; if PWB is
unreachable it also renders 404 (see F-7). Result: scrapers, broken inbound
links, and bots generate PWB API traffic and Worker invocations for unbounded
URLs.

**Recommendation:** Allow-list known CMS slugs (e.g. only call PWB if the
slug starts with a known prefix or appears in a cached list); or set
`Astro.response.status = 404` before calling PWB when the slug obviously
doesn't match.

#### F-3. EmDash database access is duplicated and untyped

Both `src/layouts/BaseLayout.astro:49` and `src/lib/site-profile.ts:103` build
the same Kysely-style query against the `options` table for keys of the form
`plugin:<id>:settings:<key>`. Both cast `db` to `any` and parse JSON in the
same way.

**Recommendation:** Extract one typed helper (e.g.
`readPluginKv(db, pluginId, keys)`); plumb the EmDash `Astro.locals.emdash.db`
typings through so the helper isn't `any`.

#### F-4. No caching layer for plugin-KV reads on D1

Every page render that touches site-profile or theme settings does a
`db.selectFrom('options').where('name', 'in', […]).execute()` round-trip.
That's two queries per render. Fine for SQLite locally; on D1 in production
it's two ms per page that doesn't change between requests.

**Recommendation:** memoise per-request (e.g. cache on `Astro.locals`) or per
deploy via a top-level KV cache.

### 4.2 Security

#### F-5. JSON-LD `<script>` blocks are not properly escaped  *(Medium / quick fix)*

`set:html={JSON.stringify(jsonLd)}` is used in:

- `src/layouts/BaseLayout.astro:140` (site JSON-LD)
- `src/layouts/BaseLayout.astro:144` (BreadcrumbList)
- `src/components/pages/IndexPage.astro:61` (Organization)
- `src/components/pages/PropertyDetailPage.astro:94` (RealEstateListing)

`JSON.stringify` does **not** escape `<`/`>`/`&`. A property name, breadcrumb
label, or description containing `</script>` can break out of the JSON-LD
block and execute arbitrary HTML/JS. Property data comes from PWB editors —
internal but not "trusted" in a strict sense.

**Recommendation:** wrap with a tiny helper:

```ts
function safeJsonLd(v: unknown) {
  return JSON.stringify(v).replace(/</g, '\\u003c').replace(/-->/g, '--\\u003e')
}
```

#### F-6. Direct HTML insertion of PWB-rendered content

- `src/components/pages/PwbPage.astro:57` — `set:html={pc.rendered_html}` for
  every page-content block.
- `src/components/PropertyFacts.astro:37` — `set:html={detail.description}`.

These are PWB-trusted today (rendered by Rails, sanitised on the Rails side),
but if PWB ever surfaces user-uploaded HTML (agent bios, listing
descriptions edited by external users) this is an XSS sink.

**Recommendation:** document that PWB is responsible for sanitising HTML, and
add a server-side allow-list sanitiser as a defence in depth (e.g.
`isomorphic-dompurify` or DOMPurify with `jsdom`).

### 4.3 Error handling and observability

#### F-7. Empty `catch {}` swallows real errors  *(Medium)*

17 silent catches in production code. Some are intentional (404 page,
sitemap), but several mask legitimate signals:

- `src/components/pages/PwbPage.astro:25-28` — turns *any* PWB error (500,
  network, parse) into a 404. A PWB outage will look like every URL is
  missing.
- `src/components/pages/IndexPage.astro:40-43` — homepage silently swaps to
  fallback site on any failure.
- `src/components/pages/PropertyDetailPage.astro:34-36` — property detail
  treats every failure as 404.
- `src/components/pages/PostPage.astro:37`, `PostsIndexPage.astro:23`,
  `CategoryPage.astro:26`, `TagPage.astro:26`, `SearchPage.astro:26`,
  `CmsPage.astro:28` — same pattern.
- `src/layouts/BaseLayout.astro:75-77` — DB read of theme settings swallows
  everything.
- `src/lib/site-profile.ts:140` — site profile read swallows everything.
- `src/lib/pwb/enquiry-api.ts:42, :98` — JSON parse and submit errors logged
  only as user-facing messages; no server-side log.
- `packages/plugins/pwb-property-embeds/src/index.js:68` — admin "quick pick"
  silently empties.
- `src/components/ContactForm.astro:163` — network errors only surface as
  generic "Network error" to the user.

**Recommendation:** distinguish "expected 404" from "unexpected error". On
unexpected errors, log via `console.error('[pwb] page=…', err)` so Worker
observability catches them.

#### F-8. PWB client logs every request in production  *(Low / quick fix)*

`src/lib/pwb/client.ts:42`:

```ts
console.info(`[pwb] GET ${urlStr}`)
```

This runs on every request including production. On Cloudflare Workers it
floods observability and exposes full URLs (which include search params from
the public search form, i.e. user input). Errors are also logged to
`console.error` with `cf-ray` and `server` headers, which is useful — but
the unconditional info-level log is noise.

**Recommendation:** gate with `import.meta.env.DEV`, or remove and rely on
Workers' native request logs.

### 4.4 SEO and content delivery

#### F-9. Properties sitemap is silently capped at 1000 entries

`src/pages/sitemap-properties.xml.ts:42` — loop condition
`page <= 10 && page <= totalPages` with `per_page = 100`. If an agency has
more than 1000 listings, the rest are silently invisible to search engines.

**Recommendation:** split into multiple `sitemap-properties-N.xml` files and
list each in the sitemap index, or document the limit prominently.

#### F-10. Sitemap and robots are correctly registered

`src/pages/sitemap.xml.ts` produces a sitemap index that points to
`/sitemap-properties.xml` and `/_emdash/api/sitemap/posts.xml`.
`src/pages/robots.txt.ts` references `/sitemap.xml`. Cache headers set
correctly (`max-age=3600` for sitemaps, `max-age=86400` for robots).

#### F-11. JSON-LD coverage is good

- `RealEstateAgent` Organization on home (`IndexPage.astro:50`)
- `RealEstateListing` per property (`PropertyDetailPage.astro:57`)
- `BreadcrumbList` on every page that passes breadcrumbs
  (`BaseLayout.astro:144`)
- Site-level JSON-LD via `buildPageMeta` (`src/lib/pwb/site-config.ts`).

(See F-5 for the escaping caveat.)

### 4.5 Internationalisation

#### F-12. i18n is hand-rolled and fragile

`src/lib/locale.ts` (~290 lines) hardcodes UI strings in two giant
`Record<string, Record<string, string>>` objects (`UI_TRANSLATIONS`,
`BRAND_TRANSLATIONS`). Every translatable string in components is a literal
English source key passed to `translateLabel(locale, '...')`. There is no
warning, lint, or test that flags missing translations — `translateLabel`
silently falls back to English.

For a real-estate brand site shipping in three languages this is a
maintenance liability. New strings will quietly stay in English in `es`/`fr`
until someone manually audits.

**Recommendation:**

1. Split each locale into its own file (`src/i18n/en.ts`, `es.ts`, `fr.ts`)
   so a missing key produces a TypeScript error.
2. Add a vitest test that asserts `Object.keys(es)` ≡ `Object.keys(en)`.
3. (Optional) audit current translations — at a glance several Spanish
   strings appear to drop accents (`Banos`, `Articulos`, `dia`, `mas`).

#### F-13. Locale set is hard-coded in three places

`astro.config.ts` `i18n.locales`, `SUPPORTED_LOCALES` in `src/lib/locale.ts`,
and `LOCALE_LABELS`. The locale.ts header comments warn about this — it's
documented but it's still drift waiting to happen.

### 4.6 Code quality

#### F-14. Vitest coverage `include: ['src/**/*.astro']` is misleading

`vitest.config.ts:14-19` tries to instrument Astro components. Vitest cannot
actually execute `.astro` files, so the coverage reported for the largest
files (1009-line `Base.astro`, 999-line `PostPage.astro`, 919-line
`PropertyGallery.astro`) is meaningless. The 80% threshold across the
codebase is therefore softer than it looks.

**Recommendation:** drop `*.astro` from `include` and rely on Playwright e2e
for layout coverage, or build a Vitest plugin that compiles Astro files.

#### F-15. Large components

Some Astro components are very long and would benefit from extraction:

| File                                    | LOC  |
| --------------------------------------- | ---- |
| `src/layouts/Base.astro`                | 1009 |
| `src/components/pages/PostPage.astro`   | 999  |
| `src/components/PropertyGallery.astro`  | 919  |
| `src/components/pages/IndexPage.astro`  | 688  |
| `src/plugins/site-profile.sandbox.ts`   | 570  |
| `src/components/SiteHeader.astro`       | 469  |
| `src/components/pages/PropertyDetailPage.astro` | 470 |
| `src/components/pages/PropertyIndexPage.astro`  | 460 |
| `src/plugins/pwb-theme.sandbox.ts`      | 459  |
| `src/components/pages/CmsPage.astro`    | 445  |
| `src/components/SearchBar.astro`        | 438  |

Most of the bulk in Astro components is local CSS, which is acceptable, but
several have substantial inline `<script>` blocks (gallery keyboard handling,
share button, recently viewed) that would be cleaner as Stimulus-style or
plain ES module files.

#### F-16. `db: any` and other type leaks

Several places cast `db` to `any` (`BaseLayout.astro:49`, the plugin sandbox
files). The EmDash typings exist; they should be wired through.

#### F-17. Two competing port numbers in dev

- `scripts/dev.mjs:15` defaults `PORT` to `4444`
- `playwright.config.ts:14` uses `4321`
- README documents both
- CI starts EmDash on `4321` (`emdash dev` default)

This is solvable: pick one and stick to it. `4321` (the EmDash default) is
the natural choice; the wrapper script can then drop the `--port` flag.

#### F-18. `process.env.PORT ?? 4444` only works at the top level

`scripts/dev.mjs:15` reads `process.env.PORT ?? 4444` once at script start.
Fine for a launcher, but worth noting that the bypass URL is built from the
same `PORT`, so the two stay in sync.

### 4.7 Configuration / deployment

#### F-19. `wrangler.prod.jsonc.example` documents the deploy correctly

`main: "./dist/server/entry.mjs"`, `no_bundle: true`, `assets` pointing at
`./dist/client`. The `pnpm run deploy:prod` script runs `astro build` first,
which is required because the example sets `no_bundle: true`. This is
correct and matches the user's saved memory rule about wrangler config.

#### F-20. Compatibility date is 2026-03-29

`wrangler.jsonc:9` and `wrangler.prod.jsonc.example:15`. As of today
(2026-05-03) that's about a month old — fine. Worth bumping when convenient.

#### F-21. `nodejs_compat` flag is set

Required for `better-sqlite3`-style imports and the Astro Cloudflare adapter.
Correct.

#### F-22. Emdash sandboxing is not in use

`astro.config.ts`: `sandboxed: []`, `sandboxRunner: undefined`,
`marketplace: undefined`. All plugins (in-repo and workspace) run in the
main runtime. Acceptable for a single-tenant deploy of in-house plugins.

### 4.8 Tests

#### F-23. Unit tests are real and well-scoped

34 unit/integration test files. Examples:

- `src/lib/pwb/client.test.ts` — exercises `PwbClient` methods against MSW
  mocks
- `src/pages/api/enquiries.test.ts` — request/response shape, validation,
  attribution
- `src/lib/locale.test.ts` — locale validation and path building
- `src/lib/property-cta.test.ts` — every CTA branch
- `src/lib/site-launch-checklist.test.ts` — checklist derivation
- `src/lib/d1-sync-utils.test.ts` — SQL plan generation for the prod sync
  scripts
- `src/styles/theme-conventions.test.ts`,
  `src/components/site-chrome-conventions.test.ts`,
  `src/components/property-card-conventions.test.ts`,
  `src/components/index-page-visual-conventions.test.ts` — convention tests
  (file-level lint rules)
- `src/page-conventions.test.ts`, `src/localized-route-conventions.test.ts`,
  `src/not-found-routes.test.ts` — global page conventions

#### F-24. E2E tests cover the high-value paths

`e2e/` has 6 Playwright specs:

- `blog.spec.ts`
- `contact-form.spec.ts`
- `enquiry-flow.spec.ts`
- `locale-switching.spec.ts`
- `property-search.spec.ts`
- `visual-regression.spec.ts`

E2E specs are tolerant of missing data (`test.skip()` if no properties
exist), which is correct given they run against `seed:minimal`.

#### F-25. `vitest.config.ts` `globals: true`

Test files use globals (`describe`, `it`, `expect`) imported from `vitest`
anyway. `globals: true` is harmless but redundant.

### 4.9 Plugin packages

#### F-26. Workspace plugins are clean

- `pwb-properties` — admin UI listing properties; sandboxed with
  `network:fetch:any`. The settings flow stores the PWB API URL in plugin KV
  and the admin can probe the connection.
- `pwb-page-parts` — Portable Text block definitions for hero, CTA, features,
  stats, testimonials, etc.
- `pwb-property-embeds` — Portable Text block + admin route to list
  properties for the "quick pick" select.
- `pwb-valuation` — sandboxed plugin + Astro integration that injects a
  `/valuation` route via virtual modules. The integration pattern is
  exemplary.

#### F-27. Site-local plugins

- `src/plugins/pwb-theme.{ts,sandbox.ts}` — palette + density + surface +
  motion + header settings, persisted to plugin KV. `BaseLayout.astro` reads
  and applies overrides as inline CSS.
- `src/plugins/site-profile.{ts,sandbox.ts}` — brand name, tagline, office
  contact, response pledge, property CTA defaults.
- `src/plugins/resend-email.{ts,sandbox.ts}` — minimal but correct: stores
  API key in KV, declares `allowedHosts: ['api.resend.com']`, hooks
  `email:deliver`. The `from` address is required and validated.

#### F-28. `DEFAULT_SITE_PROFILE_SETTINGS` ships demo PII

`src/lib/site-profile.ts:39` ships a fake address, phone, and email
(`hello@demorealty.com`). Used as a fallback if the admin hasn't configured
the plugin. Acceptable for a template; worth a comment that these *will*
appear to end users on first deploy if the launch checklist isn't completed.

#### F-29. EmDash patch is 0.5.0-pinned

`patches/emdash@0.5.0.patch` is the live patch. Older patches (0.1.0, 0.2.0)
remain in the directory for historical reference. The patch is referenced
correctly in `package.json` `pnpm.patchedDependencies`.

### 4.10 Validation and form handling

#### F-30. Enquiry validation is reasonable but minimal

`src/lib/pwb/enquiry-validator.ts`:

- Name: required (trimmed)
- Email: regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` (loose but acceptable for a
  contact form)
- Message: required, ≥10 chars
- Phone is **not validated** — passed to PWB as-is.

`src/lib/pwb/enquiry-api.ts:55-58` reads `page_type`, `property_slug`,
`cta_source` from the request body without an allow-list. They flow into the
attribution note appended to the message body
(`buildAttributionNote`), so a hostile client can write arbitrary lines into
the enquiry that lands in PWB. This is a low-impact issue — the message ends
up in an admin inbox, not in a public surface — but worth a length cap.

**Recommendation:**

- Trim and length-cap `phone` (e.g. 30 chars).
- Whitelist `pageType` values (`'property' | 'contact' | 'general'`).
- Length-cap `propertySlug` and `ctaSource`.

### 4.11 Documentation

#### F-31. Docs are thorough but heavy

`docs/` has 27+ files. Roadmaps and execution plans are detailed
(`product-improvement-roadmap.md`, `product-improvement-execution-plan.md`,
`tdd-implementation-plan.md`). Plugin plan docs (`pwb-properties-plugin*.md`,
`pwb-valuation-plugin.md`, `resend-email-plugin.md`) capture design before
build. Troubleshooting guide is present.

#### F-32. The parent CLAUDE.md is mostly Rails-specific

`property_web_builder/CLAUDE.md` (loaded into context for this subrepo) is
the **Rails monorepo's** instructions — RSpec, FactoryBot, ERB/Liquid,
Stimulus, asset-clobber warnings, multi-tenant scoping. Most of it doesn't
apply here. It also contains very strong "ask before commit" rules that this
subrepo's `AGENTS.md` doesn't restate.

**Recommendation:** either scope the parent CLAUDE.md to the Rails app, or
add a clarifying note in the subrepo's `AGENTS.md` that the parent rules
about `current_website`, ERB, etc. don't apply here.

### 4.12 Operational scripts

#### F-33. `scripts/push-local-db-to-d1.mjs` is non-trivial

≈300 lines. Imports helpers from `scripts/lib/d1-sync-utils.mjs` (which has
unit tests in `src/lib/d1-sync-utils.test.ts`). Handles backup tables,
additive schema sync, chunking SQL statements, duplicate-constraint detection.
Solid.

#### F-34. `reset-admin-access.mjs` exists for prod recovery

`pnpm reset:admin-access` is wired up with a hardcoded production URL. Useful
runbook command, documented in `docs/admin-access-recovery.md`.

#### F-35. `dev.mjs` opens the bypass URL automatically

Nice DX: `pnpm dev` starts `emdash dev --port 4444` and opens
`/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin` in the browser as
soon as the server is ready. Falls back to printing the URL when `open(1)` is
unavailable.

---

## 5. Recommendations, prioritised

### P0 — quick wins (≤1 hr each)

1. **Escape JSON-LD `<script>` payloads** (F-5). Add a `safeJsonLd` helper
   and use it in all four `set:html={JSON.stringify(...)}` call sites.
2. **Stop logging every PWB request in production** (F-8). Gate
   `console.info('[pwb] GET …')` on `import.meta.env.DEV`.
3. **Length-cap and whitelist enquiry attribution fields** (F-30).

### P1 — medium effort (a few hours each)

4. **Differentiate "expected 404" from "unexpected error"** (F-7) in the page
   components and the catch-all route. Add `console.error(...)` for the
   non-404 case so Workers observability surfaces real outages.
5. **Tighten the catch-all route** (F-2). Allow-list known PWB slugs or
   short-circuit before calling PWB.
6. **Memoise plugin-KV reads per request** (F-4). Likely a small wrapper on
   `Astro.locals`.
7. **Split i18n into per-locale files** (F-12) and add a missing-keys test.
8. **Fix the Vitest coverage `include`** (F-14) to exclude `*.astro`.
9. **Pick a single dev port** (F-17). Drop the `--port 4444` flag in
   `scripts/dev.mjs` so dev/CI/Playwright all use 4321.

### P2 — larger projects (multi-day)

10. **Consolidate `Base.astro` and `BaseLayout.astro`** (F-1). Single root
    layout, single design-token namespace, smaller subcomponents for `<head>`
    and chrome.
11. **Plumb typed EmDash DB access** (F-3, F-16) and remove `db: any`.
12. **Multi-file properties sitemap** (F-9) for sites with >1000 listings.
13. **Audit current `es`/`fr` translations** for accent loss / completeness
    (F-12).

### P3 — nice to have

14. Add a CI step that runs a full `astro build` to catch issues that only
    surface in the production bundle.
15. Add a defence-in-depth HTML sanitiser for PWB-rendered HTML (F-6).
16. Consider extracting inline `<script>` blocks in large components (F-15)
    into typed modules.
17. Bump compatibility date when convenient (F-20).

---

## 6. What's *not* a problem

- Bundle / build setup is sane. The Vite `optimizeDeps.exclude` list in
  `astro.config.ts` is long but each entry is justified by a comment about
  pnpm-symlinked packages or React-instance singletons. The
  `use-sync-external-store/shim/*` aliases are documented as a workaround for
  the CJS shim under React 19.
- The `data.db` files in the working tree are gitignored and not in the
  deployment bundle (production uses D1 via `wrangler.prod.jsonc`).
- Secrets are handled correctly: `.env.example` is checked in, `.env` is not,
  Wrangler secrets are documented for prod (`wrangler secret put PWB_API_URL`).
- The `rss.xml` route exists for both default and `[lang]` locales.
- The 404 page deliberately doesn't call PWB (good).

---

## 7. Open questions for the maintainer

1. Is the dual-layout split intentional (separate visual identities for
   editorial vs listings), or accidental? Answer changes the priority of F-1.
2. Are there agencies running this with >1000 listings today (F-9)?
3. Should the `[...slug]` catch-all hit PWB at all, or are CMS pages always
   under `/pages/<slug>` (F-2)?
4. Is there an i18n owner who can confirm the current `es`/`fr` translations
   are intentional (F-12)?
5. Are the 0.1.0/0.2.0 EmDash patches safe to delete now that 0.5.0 is the
   pinned version? They add ≈18 KB of noise.

---

## 8. Inventory of file:line references used

| Reference | What it shows |
| --- | --- |
| `astro.config.ts:34-100` | dev/prod adapter split, plugin registration, Vite tweaks |
| `wrangler.jsonc:1-39` | public-template wrangler config |
| `wrangler.prod.jsonc.example:10-47` | production wrangler config |
| `package.json` | scripts list (incl. `deploy`, `deploy:prod`, `check`, `test:e2e`) |
| `src/worker.ts:1-2` | re-exports `@astrojs/cloudflare/entrypoints/server` |
| `src/live.config.ts:11-13` | EmDash live collection registration |
| `src/layouts/Base.astro` | EmDash blog/page layout (1009 LOC) |
| `src/layouts/BaseLayout.astro:38-99` | PWB property layout + theme settings DB read |
| `src/lib/locale.ts` | locale validation + UI translations |
| `src/lib/route-locale.ts` | localised route helpers |
| `src/lib/pwb/client.ts:42` | unconditional info log |
| `src/lib/pwb/client.ts:117-119` | `PWB_API_URL` env var requirement |
| `src/lib/pwb/enquiry-api.ts:55-58, :74-103` | enquiry attribution + submission |
| `src/lib/pwb/enquiry-validator.ts:8-26` | validation rules |
| `src/lib/site-profile.ts:99-143` | DB read of site-profile settings |
| `src/components/pages/PwbPage.astro:25-28, :49-60` | catch-all page rendering |
| `src/components/pages/IndexPage.astro:40-43, :50-58` | homepage Organization JSON-LD |
| `src/components/pages/PropertyDetailPage.astro:34-36, :57-78, :94, :199-240` | property detail flow |
| `src/components/ContactForm.astro:85-171` | client-side enquiry submission |
| `src/components/PropertyCard.astro` | listing card markup |
| `src/pages/api/enquiries.ts` | enquiries POST handler |
| `src/pages/sitemap.xml.ts` | sitemap index |
| `src/pages/sitemap-properties.xml.ts:42-46` | 1000-entry cap |
| `src/pages/robots.txt.ts` | robots |
| `src/pages/404.astro:6-7` | 404 deliberately doesn't call PWB |
| `src/plugins/site-profile.sandbox.ts` | admin UI for site-profile plugin |
| `src/plugins/pwb-theme.ts:50-64` | theme settings shape + KV keys |
| `src/plugins/resend-email.sandbox.ts` | email plugin |
| `packages/plugins/pwb-properties/src/index.js` | properties admin plugin |
| `packages/plugins/pwb-valuation/src/integration.js` | virtual-module Astro integration |
| `playwright.config.ts` | e2e config |
| `vitest.config.ts:14-19` | coverage thresholds + Astro include (F-14) |
| `.github/workflows/ci.yml` | CI pipeline |
| `scripts/dev.mjs:15-19` | dev launcher port 4444 |
| `scripts/seed.mjs`, `scripts/reset.mjs` | seed/reset scripts |

---

*End of review.*
