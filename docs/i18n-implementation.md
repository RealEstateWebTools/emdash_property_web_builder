# Multi-Language (i18n) Implementation

This document started as an implementation plan and now serves as the implementation record
for the locale-aware routing and rendering that ships in this repo today. It still includes
the design rationale behind the approach, but the high-level architecture below reflects the
code that is currently in the tree.

## Current State

The repo now has working locale-aware routing for English, Spanish, and French across both
EmDash content and PWB-backed property pages.

- English remains unprefixed because `prefixDefaultLocale` is `false`.
- Non-default locales use Astro route wrappers under `src/pages/[lang]/**`.
- Shared page implementations live in `src/components/pages/**` so default and localized
  routes render through the same code paths.
- Shared locale helpers live in `src/lib/locale.ts` and currently provide `validateLocale()`,
  `localePath()`, `entrySlug()`, `translateLabel()`, and `translateBrand()`.
- Minimal translated content is seeded in `seed/seed.json` via `locale` and `translationOf`.
- RSS feeds are now available per locale at `/rss.xml`, `/es/rss.xml`, and `/fr/rss.xml`.

Two implementation details differ from the original plan:

- Locale switching is handled directly in shared header and layout components. There is no
  standalone `LanguageSwitcher.astro` or `LocaleLink.astro` component.
- Brand localization is handled centrally via `translateBrand()` rather than by duplicating
  per-locale brand strings in individual templates.

---

## Background and Constraints

This site has **two content systems** that handle locale differently:

| System | How locale is used | Where |
|---|---|---|
| **EmDash CMS** | `locale` param on `getEmDashEntry` / `getEmDashCollection` | Blog posts, CMS pages |
| **PWB Rails API** | `locale` in URL path (`/api_public/v1/{locale}/...`) | Properties, site details |

EmDash uses a **row-per-locale** database model. Each translation is a fully independent row
with its own slug, status, and revision history, linked via a shared `translation_group` ID.
This means a Spanish blog post has a different slug than the English version, and can be
published or drafted independently.

The PWB `PwbClient` already has locale built in — `localizedApiBase` includes `this.locale`
in the URL. `createPwbClient()` accepts a `locale` argument. No changes to `client.ts` are
needed; only the call sites need updating.

---

## Routing Strategy Decision

**Recommendation: `prefixDefaultLocale: false`**

This keeps all existing English URLs unchanged (`/`, `/posts/my-post`, `/properties`) and
adds locale prefixes only for non-default languages (`/es/`, `/es/posts/mi-entrada`).

The alternative (`prefixDefaultLocale: true`) would break all existing URLs and is not
worth the migration cost.

URL structure with English as default and Spanish + French added:

```
/                        → en (no prefix)
/posts/my-post           → en
/properties              → en (PWB, unchanged)

/es/                     → es
/es/posts/mi-entrada     → es
/es/properties           → es (PWB, locale in API call)

/fr/                     → fr
/fr/posts/mon-article    → fr
```

---

## Implementation Inventory

These are the main files that now define the shipped i18n behavior.

### Config and helpers
- `astro.config.mjs`
- `src/lib/locale.ts`

### Shared page implementations
- `src/components/pages/IndexPage.astro`
- `src/components/pages/PostsIndexPage.astro`
- `src/components/pages/PostPage.astro`
- `src/components/pages/CmsPage.astro`
- `src/components/pages/CategoryPage.astro`
- `src/components/pages/TagPage.astro`
- `src/components/pages/SearchPage.astro`
- `src/components/pages/PwbPage.astro`
- `src/components/pages/PropertyIndexPage.astro`
- `src/components/pages/PropertyDetailPage.astro`

### Route wrappers
- Default-locale routes under `src/pages/**`
- Non-default locale wrappers under `src/pages/[lang]/**`

### Shared shell and navigation
- `src/layouts/Base.astro`
- `src/layouts/BaseLayout.astro`
- `src/components/SiteHeader.astro`
- `src/components/SiteFooter.astro`
- `src/components/SearchBar.astro`
- `src/components/PropertyCard.astro`
- `src/components/PropertyGrid.astro`
- `src/components/SimilarProperties.astro`

### Content and validation
- `seed/seed.json`
- `src/docs-validation.test.ts`
- `src/not-found-routes.test.ts`
- `src/lib/locale.test.ts`
- `src/localized-route-conventions.test.ts`
- `src/lib/pwb/site-config.test.ts`

---

## Phase 1: Astro Config

### `astro.config.mjs`

Add the `i18n` block. EmDash reads it automatically — no extra EmDash config needed.

```js
// Add this block inside defineConfig({})
i18n: {
  defaultLocale: 'en',
  locales: ['en', 'es', 'fr'],
  fallback: {
    es: 'en',  // Spanish falls back to English when content not translated
    fr: 'en',
  },
  routing: {
    prefixDefaultLocale: false,  // /posts/... not /en/posts/...
  },
},
```

**Where to place it**: At the top level of `defineConfig({})`, alongside `output`, `adapter`,
`integrations`, etc.

**Effect**: Astro's i18n middleware activates automatically. `Astro.currentLocale` is set on
every request. `/es/posts/mi-entrada` → `Astro.currentLocale === 'es'`.

---

## Phase 2: Page Restructure

### The `[lang]` pattern

Non-default locale pages live in `src/pages/[lang]/`. Astro matches `/es/posts/my-post`
with `src/pages/[lang]/posts/[slug].astro`, setting `Astro.params.lang = 'es'`.

**Important**: `[lang]` must be validated. The directory catches any first path segment, not
just configured locales. A request to `/foo/posts/bar` can match too. The locale helper
(Phase 3) handles this.

### Modified default-locale pages

Each default-locale page needs one change: pass `locale: Astro.currentLocale` to every
`getEmDashEntry` and `getEmDashCollection` call, and pass `Astro.currentLocale` to
`createPwbClient()`.

**`src/pages/index.astro`**
```astro
---
import { getEmDashEntry } from 'emdash'
import { PortableText } from 'emdash/ui'
import { createPwbClient } from '../lib/pwb/client'
import { formatPropertyCard } from '../lib/pwb/formatters'
import BaseLayout from '../layouts/BaseLayout.astro'
import PropertyGrid from '../components/PropertyGrid.astro'

const locale = Astro.currentLocale ?? 'en'                         // ← add

const { entry: homepage, cacheHint } = await getEmDashEntry(
  'pages', 'homepage', { locale }                                    // ← add locale
)
Astro.cache.set(cacheHint)

const client = createPwbClient(locale)                             // ← add locale
const [site, results] = await Promise.all([
  client.getSiteDetails(),
  client.searchProperties({ featured: 'true', per_page: 6 }),
])

const cards = results.data.map(formatPropertyCard)
---
```

**`src/pages/posts/index.astro`**
```astro
---
import { getEmDashCollection, getEntryTerms } from "emdash";
// ...other imports

const locale = Astro.currentLocale ?? 'en'                         // ← add

const { entries: posts, cacheHint } = await getEmDashCollection("posts", {
  locale,                                                           // ← add
  status: 'published',
  orderBy: { published_at: 'desc' },
})
Astro.cache.set(cacheHint)
// rest unchanged
---
```

**`src/pages/posts/[slug].astro`**
```astro
---
// ...imports

const locale = Astro.currentLocale ?? 'en'                         // ← add
const { slug } = Astro.params
const safeSlug = slug ?? null
const { entry: post, cacheHint } = safeSlug
  ? await getEmDashEntry("posts", safeSlug, { locale })            // ← add locale
  : { entry: null, cacheHint: undefined }

// ...rest unchanged
---
```

**`src/pages/pages/[slug].astro`**
```astro
---
const locale = Astro.currentLocale ?? 'en'                         // ← add
const { slug } = Astro.params
const safeSlug = slug ?? null
const { entry: page, cacheHint } = safeSlug
  ? await getEmDashEntry("pages", safeSlug, { locale })            // ← add locale
  : { entry: null, cacheHint: undefined }
// ...rest unchanged
---
```

**`src/pages/category/[slug].astro`**
```astro
---
const locale = Astro.currentLocale ?? 'en'                         // ← add
const { slug } = Astro.params
const term = slug ? await getTerm("category", slug) : null
const { entries: posts } = await getEmDashCollection("posts", {
  locale,                                                           // ← add
  where: { category: term.slug },
  orderBy: { published_at: "desc" },
})
---
```

**`src/pages/tag/[slug].astro`** — same pattern as category.

**`src/pages/search.astro`**
```astro
---
const locale = Astro.currentLocale ?? 'en'                         // ← add
const { entries: allPosts } = await getEmDashCollection("posts", {
  locale,                                                           // ← add
})
---
```

### New non-default locale pages

These files are thin: they validate the locale, then render the same content as their
default-locale counterpart, but with `params.lang` passed as the locale.

**`src/pages/[lang]/index.astro`**
```astro
---
import { getEmDashEntry } from 'emdash'
import { PortableText } from 'emdash/ui'
import { createPwbClient } from '../../lib/pwb/client'
import { formatPropertyCard } from '../../lib/pwb/formatters'
import BaseLayout from '../../layouts/BaseLayout.astro'
import PropertyGrid from '../../components/PropertyGrid.astro'
import { validateLocale } from '../../lib/locale'

const locale = validateLocale(Astro.params.lang)
if (!locale) {
  Astro.response.status = 404
}

const { entry: homepage, cacheHint } = await getEmDashEntry(
  'pages', 'homepage', { locale }
)
Astro.cache.set(cacheHint)

const client = createPwbClient(locale)
const [site, results] = await Promise.all([
  client.getSiteDetails(),
  client.searchProperties({ featured: 'true', per_page: 6 }),
])

const cards = results.data.map(formatPropertyCard)
---

<!-- Identical template to src/pages/index.astro -->
{locale ? (
  <BaseLayout site={site} title={homepage?.data.title} locale={locale}>
  <!-- ...same markup -->
  </BaseLayout>
) : null}
```

For this repo, prefer direct 404 responses over `Astro.redirect('/404')`. Dynamic routes already
follow that convention, and [src/not-found-routes.test.ts](../src/not-found-routes.test.ts)
guards against reintroducing redirect-based not-found handling.

**`src/pages/[lang]/posts/index.astro`** — same pattern.

**`src/pages/[lang]/posts/[slug].astro`** — same pattern, uses `params.slug`.

**`src/pages/[lang]/pages/[slug].astro`** — same pattern.

**`src/pages/[lang]/category/[slug].astro`** — same pattern.

**`src/pages/[lang]/tag/[slug].astro`** — same pattern.

**`src/pages/[lang]/search.astro`** — same pattern.

### Avoiding duplication: the options

The `[lang]` pages are unavoidably similar to the default-locale pages. Three approaches:

**Option A: Duplicate files (simplest, least maintainable)**
Copy each page, change import paths (add `../../`) and add `validateLocale`. Fine for
a small number of pages.

**Option B: Shared page component (recommended)**
Extract the page rendering logic into a reusable Astro component, e.g.
`src/components/pages/PostsIndexPage.astro`. Both the default and locale-prefixed pages
import and render it, passing locale. The component file does all the data fetching.

```astro
<!-- src/components/pages/PostsIndexPage.astro -->
---
interface Props { locale: string }
const { locale } = Astro.props
const { entries: posts } = await getEmDashCollection("posts", { locale })
---
<!-- template here -->
```

```astro
<!-- src/pages/posts/index.astro -->
---
import PostsIndexPage from '../../components/pages/PostsIndexPage.astro'
---
<PostsIndexPage locale={Astro.currentLocale ?? 'en'} />
```

```astro
<!-- src/pages/[lang]/posts/index.astro -->
---
import PostsIndexPage from '../../../components/pages/PostsIndexPage.astro'
import { validateLocale } from '../../../lib/locale'
const locale = validateLocale(Astro.params.lang)
if (!locale) {
  Astro.response.status = 404
}
---
<PostsIndexPage locale={locale} />
```

**Option C: Middleware-based locale injection (most elegant, requires Astro middleware)**
A custom `src/middleware.ts` injects `locals.locale` based on URL prefix, and all pages
use `Astro.locals.locale`. No `[lang]` directory needed — the middleware handles routing.
This is the most DRY approach but requires more upfront setup and careful middleware
ordering alongside EmDash's own middleware.

**Recommendation: Start with Option A only if you need to prove routing quickly. For this repo,
Option B is the better steady-state because several page families already have non-trivial data
loading and SEO logic.**

---

## Phase 3: Locale Helper

### `src/lib/locale.ts`

The `[lang]` pages need to validate that `Astro.params.lang` is a configured locale,
not an arbitrary URL segment.

```typescript
/**
 * Locale validation for [lang] pages.
 * Must stay in sync with the i18n.locales array in astro.config.mjs.
 *
 * If you add a new locale:
 * 1. Add it to astro.config.mjs i18n.locales
 * 2. Add it to SUPPORTED_LOCALES here
 * 3. Add a fallback in astro.config.mjs i18n.fallback if needed
 */
export const SUPPORTED_LOCALES = ['es', 'fr'] as const  // NON-default locales only
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]
export const DEFAULT_LOCALE = 'en'
export const ALL_LOCALES = [DEFAULT_LOCALE, ...SUPPORTED_LOCALES] as const

/**
 * Returns the locale if valid, null if not a configured non-default locale.
 * Used in [lang] pages to guard against arbitrary URL segments.
 */
export function validateLocale(lang: string | undefined): SupportedLocale | null {
  if (!lang) return null
  return (SUPPORTED_LOCALES as readonly string[]).includes(lang)
    ? (lang as SupportedLocale)
    : null
}

/**
 * Returns the locale-prefixed path for non-default locales, or the bare path
 * for the default locale.
 *
 * localePath('en', '/posts/my-post') → '/posts/my-post'
 * localePath('es', '/posts/mi-entrada') → '/es/posts/mi-entrada'
 */
export function localePath(locale: string, path: string): string {
  if (locale === DEFAULT_LOCALE) return path
  return `/${locale}${path.startsWith('/') ? path : `/${path}`}`
}
```

---

## Phase 4: Components

The original plan proposed a standalone per-entry `LanguageSwitcher.astro`, but the final
implementation does not use one. Locale switching is handled directly in shared header and
layout components, while content routes rely on locale-aware wrappers plus shared page
implementations.

### `src/components/SiteHeader.astro`

The PWB shell header now includes a simple locale switcher that links to each locale home and
uses shared helpers for menu labels and localized brand copy.

```astro
---
import { getMenu } from 'emdash'
import type { SiteDetails } from '../lib/pwb/types'
import { ALL_LOCALES, DEFAULT_LOCALE, localeLabel, localePath, translateBrand, translateLabel } from '../lib/locale'

interface Props {
  site: SiteDetails
}

const { site } = Astro.props
const primaryMenu = await getMenu('primary')
const currentLocale = Astro.currentLocale ?? DEFAULT_LOCALE
const localizedBrand = translateBrand(currentLocale, site.company_display_name ?? site.title)
---

<header class="site-header">
  <div class="site-header__inner">
    <a href={localePath(currentLocale, '/')} class="site-header__logo">
      {site.logo_url
        ? <img src={site.logo_url} alt={localizedBrand} height="40" />
        : <span class="site-header__title">{localizedBrand}</span>
      }
    </a>

    <nav class="site-header__nav" aria-label="Main navigation">
      {primaryMenu?.items.map(item => (
        <a href={localePath(currentLocale, item.url)} target={item.target}>{translateLabel(currentLocale, item.label)}</a>
      ))}
    </nav>

    <div class="site-header__locales">
      {ALL_LOCALES.map(locale => (
        <a
          href={localePath(locale, '/')}
          class:list={['site-header__locale', { 'site-header__locale--active': locale === currentLocale }]}
          aria-current={locale === currentLocale ? 'page' : undefined}
        >
          {localeLabel(locale)}
        </a>
      ))}
    </div>
  </div>
</header>
```

The header locale switcher intentionally links to each locale homepage (`/`, `/es/`, `/fr/`).
The repo does not currently implement per-entry translation navigation for posts or pages.

### `src/layouts/Base.astro` and `src/layouts/BaseLayout.astro`

The current app has two layout paths:

- `src/layouts/Base.astro` is used by the blog/CMS pages today.
- `src/layouts/BaseLayout.astro` is used by the property-site shell.

That means locale-aware head tags for posts and CMS entries belong in `Base.astro` first. If
property pages also need shared `hreflang` output, mirror the same pattern in `BaseLayout.astro`.

Two changes:

**1. Keep locale-aware data fetching at the page layer** — neither layout currently owns the main
data fetching for translated content. The page should resolve `locale` and pass already-localized
data into the layout.

**2. Add `hreflang` link tags** — These tell search engines about alternate-language versions
and are important for SEO:

```astro
---
interface Props {
  site: SiteDetails
  title?: string
  description?: string
  canonical?: string
  content?: { collection: string; id: string; slug?: string | null; routeBase?: string }
}

const { site, title, description, canonical, content } = Astro.props
const currentLocale = Astro.currentLocale ?? 'en'

// Build hreflang alternates
let hreflangLinks: Array<{ locale: string; href: string }> = []
if (content?.collection && content?.id && content.routeBase) {
  const { getTranslations } = await import('emdash')
  const { translations } = await getTranslations(content.collection, content.id)
  hreflangLinks = translations.map(t => ({
    locale: t.locale,
    href: new URL(localePath(t.locale, `${content.routeBase}/${t.slug}`), Astro.site ?? '/').href,
  }))
}
---

<head>
  <!-- ...existing head content -->
  {hreflangLinks.map(({ locale, href }) => (
    <link rel="alternate" hreflang={locale} href={href} />
  ))}
  <link rel="alternate" hreflang="x-default" href={new URL('/', Astro.site ?? '/').href} />
</head>
```

---

## Phase 5: Seed File

### `seed/seed.json`

Two changes:

**1. Add `locale` to existing content entries** — All existing entries get `"locale": "en"`.

```json
{
  "content": {
    "pages": [
      {
        "id": "homepage",
        "slug": "homepage",
        "locale": "en",
        "status": "published",
        "data": {
          "title": "Find Your Dream Property"
        }
      }
    ],
    "posts": [
      {
        "id": "welcome-post",
        "slug": "welcome",
        "locale": "en",
        "status": "published",
        "data": {
          "title": "Welcome"
        }
      }
    ]
  }
}
```

**2. Add translated entries** — For each translated piece of content, add a new entry with
`locale` and `translationOf`. The source-locale entry MUST appear before its translations.

```json
{
  "content": {
    "posts": [
      {
        "id": "welcome-post",
        "slug": "welcome",
        "locale": "en",
        "status": "published",
        "data": { "title": "Welcome", "excerpt": "..." }
      },
      {
        "id": "welcome-post-es",
        "slug": "bienvenido",
        "locale": "es",
        "translationOf": "welcome-post",
        "status": "draft",
        "data": { "title": "Bienvenido", "excerpt": "..." }
      }
    ]
  }
}
```

**3. Mark non-translatable fields** — In the `collections` schema, fields that should be
copied (not re-translated) can be marked `"translatable": false`. For example, a sort order
or a product SKU. All fields default to `translatable: true`.

```json
{
  "collections": [
    {
      "slug": "posts",
      "fields": [
        { "slug": "title", "type": "string", "translatable": true },
        { "slug": "content", "type": "portableText", "translatable": true },
        { "slug": "sort_order", "type": "number", "translatable": false }
      ]
    }
  ]
}
```

---

## Phase 6: RSS Feed

### `src/pages/rss.xml.ts` and `src/pages/[lang]/rss.xml.ts`

RSS feeds now exist per locale.

- `/rss.xml` returns the English feed.
- `/es/rss.xml` returns the Spanish feed.
- `/fr/rss.xml` returns the French feed.

The feed routes share XML generation through `src/lib/rss.ts`, which keeps feed metadata,
locale-specific URLs, and post slug normalization consistent.

---

## Phase 7: Admin — Creating Translations

No code changes needed here — EmDash's admin panel handles this automatically once i18n
is configured. In the content editor sidebar, a **Translations** panel appears listing all
configured locales. Clicking "Translate" for a locale creates a new entry with the source
content pre-filled and status set to Draft.

The admin panel also shows a locale column and filter in the content list.

---

## Phase 8: PWB API and Properties Pages

The properties pages (`src/pages/properties/index.astro`, `src/pages/properties/[slug].astro`)
fetch data from the PWB Rails API. The API is locale-aware via URL:
`/api_public/v1/{locale}/properties`.

**Changes needed**:

In each properties page:
```astro
---
const locale = Astro.currentLocale ?? 'en'
const client = createPwbClient(locale)        // ← was createPwbClient()
---
```

For the `[lang]/` locale variants, create:
- `src/pages/[lang]/properties/index.astro`
- `src/pages/[lang]/properties/[slug].astro`

These follow the same `validateLocale` pattern as other `[lang]` pages.

---

## Phase 9: Search

The current `search.astro` does client-side search over all posts fetched at render time.
After i18n, `getEmDashCollection("posts")` without a locale will return entries from all
locales mixed together, which is wrong.

Fix: filter to the current locale.
```astro
const locale = Astro.currentLocale ?? 'en'
const { entries: allPosts } = await getEmDashCollection("posts", { locale })
```

This means the search page at `/search?q=foo` searches English content, and
`/es/search?q=foo` searches Spanish content. Each locale's search page is independent.

---

## Implementation Order

Most of the original rollout plan has now been completed.

Completed:

1. `src/lib/locale.ts` now defines locale validation, URL prefixing, locale-prefixed ID
  normalization, shared UI label translation, and shared brand translation.
2. `astro.config.mjs` enables Astro i18n with English as the unprefixed default locale.
3. Default-locale routes and non-default locale wrappers both render through shared page
  implementations in `src/components/pages/**`.
4. `seed/seed.json` includes translated sample entries using `locale` and `translationOf`.
5. Shared shells and property search UI localize the visible shared chrome and metadata.
6. RSS feeds now exist for the default locale and each non-default locale.

Still intentionally incomplete:

1. Backend-driven content like widget copy, property titles, and some editorial text still
  depends on translated content data rather than shared UI helpers.

---

## Testing Coverage

Current automated coverage includes:

- `src/docs-validation.test.ts` verifies locale helper parity with `astro.config.mjs`.
- `src/not-found-routes.test.ts` verifies direct 404 handling for dynamic routes.
- `src/lib/locale.test.ts` verifies helper behavior for route validation, path generation,
  slug normalization, UI label translation, and brand translation.
- `src/localized-route-conventions.test.ts` verifies localized route wrappers use
  `validateLocale()`, return direct 404s for invalid locale segments, keep brand translation in
  shared shells, and keep both default and localized RSS routes in place.
- `src/lib/rss.test.ts` verifies localized feed metadata and locale-aware post/feed URLs.
- `src/lib/pwb/site-config.test.ts` verifies localized brand names flow into page metadata.

Recommended manual verification after any future i18n changes:

- `/`, `/es/`, and `/fr/` load correctly.
- `/es/search` and `/fr/search` show localized shared labels.
- `/es/properties` and `/fr/properties` show localized shared property UI.
- `/es/posts/...` and `/fr/posts/...` build locale-correct public URLs.
- Missing localized content returns a direct 404 rather than redirecting to `/404`.

### Validation test to add to `src/docs-validation.test.ts`

```typescript
it('locale helper SUPPORTED_LOCALES matches astro.config.mjs i18n.locales (excluding default)', () => {
  const configPath = join(ROOT, 'astro.config.mjs')
  const config = readFileSync(configPath, 'utf-8')
  const localeHelper = readFileSync(join(ROOT, 'src/lib/locale.ts'), 'utf-8')

  // Extract locales from astro config
  const configMatch = config.match(/locales:\s*\[([^\]]+)\]/)
  expect(configMatch, 'i18n.locales not found in astro.config.mjs').toBeTruthy()
  const configLocales = (configMatch![1].match(/'([a-z]+)'/g) ?? [])
    .map(s => s.replace(/'/g, ''))
    .filter(l => l !== 'en') // exclude default

  // Extract SUPPORTED_LOCALES from locale helper
  const helperMatch = localeHelper.match(/SUPPORTED_LOCALES\s*=\s*\[([^\]]+)\]/)
  expect(helperMatch, 'SUPPORTED_LOCALES not found in src/lib/locale.ts').toBeTruthy()
  const helperLocales = (helperMatch![1].match(/'([a-z]+)'/g) ?? [])
    .map(s => s.replace(/'/g, ''))

  expect(helperLocales.sort()).toEqual(configLocales.sort())
})
```

---

## Common Pitfalls

### `Astro.currentLocale` is `undefined` in some contexts
If `prefixDefaultLocale: false` and you're on a default-locale URL, Astro may return
`undefined` for `Astro.currentLocale` (since there is no prefix). Always use
`Astro.currentLocale ?? 'en'` (or whatever your `defaultLocale` is). The locale helper
exports `DEFAULT_LOCALE` for this purpose.

### `[lang]` catches non-locale paths
If you have `src/pages/[lang]/index.astro`, a request to `/admin` (before EmDash's
middleware handles it) might match this route. The `validateLocale` guard and direct 404
handling prevent that. Ensure `validateLocale` strictly checks against
`SUPPORTED_LOCALES` (the non-default locales) only — not all locales.

### Translation group ordering in seed
In `seed/seed.json`, the source-locale entry must appear before its translations. If
`translationOf` references an ID that hasn't been seeded yet, the seed will fail or create
an orphaned entry. Keep source entries at the top of each collection array.

### EmDash content vs PWB pages
`src/pages/[...slug].astro` handles PWB Rails pages (content from the Rails backend, not
EmDash). This page calls `client.getPageBySlug(slug)`, which already uses `this.locale`.
Update it to pass `Astro.currentLocale` to `createPwbClient()`. The `[lang]/[...slug].astro`
locale variant follows the same pattern.

### Content fallback is a product decision, not an automatic i18n feature
Astro route fallback and EmDash translation lookup are separate concerns. If `/es/posts/foo`
should render English content when no Spanish translation exists, that behavior needs explicit
page-level lookup logic and clear canonical/`hreflang` rules. Do not assume `fallback` in the
Astro config automatically provides translated-content fallback for EmDash queries.

### RSS and sitemap
RSS readers do not follow locale redirects well. Explicitly lock the RSS feed to the default
locale. If you add a sitemap later (e.g. `@astrojs/sitemap`), configure it to exclude
`[lang]` routes from the default-locale sitemap, or generate per-locale sitemaps.

### Menu links
`getMenu('primary')` returns menu items with their stored URLs (e.g. `/posts`). In a
multi-locale setup, header nav links should be locale-prefixed for non-default locales.
The updated `SiteHeader.astro` above uses `localePath(currentLocale, item.url)` to handle
this automatically. Ensure menu item URLs in the seed are stored as root-relative paths
without locale prefix (e.g. `/posts` not `/en/posts`).

---

## Related Resources

- [EmDash i18n guide](https://github.com/emdash-cms/emdash/blob/main/docs/src/content/docs/guides/internationalization.mdx)
- [Astro i18n routing](https://docs.astro.build/en/guides/internationalization/)
- `src/lib/pwb/client.ts` — `createPwbClient(locale)` signature
- `astro.config.mjs` — add `i18n` block here
- `src/lib/locale.ts` — to create (locale validation helper)
