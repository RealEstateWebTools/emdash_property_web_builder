# Multi-Language (i18n) Implementation Plan

This document is an implementation plan for adding multi-language support to this
EmDash property site. It is grounded in the current repo structure, but a few parts remain
design decisions rather than confirmed final code. Treat it as a repo-specific guide, not a
drop-in patch set.

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

## Complete File Inventory

Every file that requires a change, grouped by phase.

### Phase 1 — Astro config (1 file)
- `astro.config.mjs`

### Phase 2 — Page restructure (9 files created, 6 files modified)
- `src/pages/index.astro` ← modify (add locale to queries)
- `src/pages/posts/index.astro` ← modify
- `src/pages/posts/[slug].astro` ← modify
- `src/pages/pages/[slug].astro` ← modify
- `src/pages/category/[slug].astro` ← modify
- `src/pages/tag/[slug].astro` ← modify
- `src/pages/search.astro` ← modify
- `src/pages/[lang]/index.astro` ← create (non-default locale home)
- `src/pages/[lang]/posts/index.astro` ← create
- `src/pages/[lang]/posts/[slug].astro` ← create
- `src/pages/[lang]/pages/[slug].astro` ← create
- `src/pages/[lang]/category/[slug].astro` ← create
- `src/pages/[lang]/tag/[slug].astro` ← create
- `src/pages/[lang]/search.astro` ← create
- `src/pages/rss.xml.ts` ← modify (default locale only; add locale-specific feeds optionally)

### Phase 3 — Shared locale logic (1 file created)
- `src/lib/locale.ts` ← create (locale validation helper used by `[lang]` pages)

### Phase 4 — Components and layouts (2 files created, 3 files modified)
- `src/components/LanguageSwitcher.astro` ← create
- `src/components/LocaleLink.astro` ← create (locale-aware `<a>` wrapper)
- `src/components/SiteHeader.astro` ← modify (add language switcher)
- `src/layouts/Base.astro` ← modify (blog and CMS pages use this today)
- `src/layouts/BaseLayout.astro` ← modify only if property-site pages also need shared locale SEO tags

### Phase 5 — Seed file (1 file)
- `seed/seed.json` ← modify (add `locale` to content entries, add translated entries)

### Phase 6 — Tests and docs (2 files)
- `src/docs-validation.test.ts` ← modify (add i18n config validation tests)
- `docs/i18n-implementation.md` ← this file

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

### `src/components/LanguageSwitcher.astro`

Shows links to all available translations of the current entry. Uses EmDash's
translation lookup to discover which locales have content, and a route-aware path builder to
avoid assuming every translated entry lives at `/${slug}`.

```astro
---
import { getTranslations } from 'emdash'
import { localePath, ALL_LOCALES } from '../lib/locale'

interface Props {
  collection: string
  entryId: string   // entry.data.id (the ULID, not the slug)
  buildPath: (slug: string) => string
}

const { collection, entryId, buildPath } = Astro.props
const { translations } = await getTranslations(collection, entryId)

// Index translations by locale for fast lookup
const byLocale = Object.fromEntries(translations.map(t => [t.locale, t]))

const LOCALE_LABELS: Record<string, string> = {
  en: 'EN',
  es: 'ES',
  fr: 'FR',
}
---

<nav class="language-switcher" aria-label="Language">
  {ALL_LOCALES.map(locale => {
    const t = byLocale[locale]
    if (!t) {
      // No translation for this locale — render as disabled
      return (
        <span class="language-switcher__item language-switcher__item--missing"
          title={`Not yet translated`}>
          {LOCALE_LABELS[locale] ?? locale.toUpperCase()}
        </span>
      )
    }
    const href = localePath(locale, buildPath(t.slug))
    const isCurrent = locale === Astro.currentLocale
    return (
      <a
        href={href}
        class="language-switcher__item"
        class:list={[{ 'language-switcher__item--active': isCurrent }]}
        aria-current={isCurrent ? 'page' : undefined}
      >
        {LOCALE_LABELS[locale] ?? locale.toUpperCase()}
      </a>
    )
  })}
</nav>

<style>
  .language-switcher {
    display: flex;
    gap: 0.5rem;
    font-size: var(--font-size-sm);
  }
  .language-switcher__item {
    padding: 0.2rem 0.5rem;
    border-radius: var(--radius);
    text-decoration: none;
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border);
  }
  .language-switcher__item--active {
    background: var(--color-accent);
    color: var(--color-on-accent);
    border-color: var(--color-accent);
  }
  .language-switcher__item--missing {
    opacity: 0.4;
    cursor: default;
  }
</style>
```

Usage on a post detail page:
```astro
<LanguageSwitcher
  collection="posts"
  entryId={post.data.id}
  buildPath={(slug) => `/posts/${slug}`}
/>
```

### `src/components/SiteHeader.astro`

Add a locale switcher to the header nav. For the header, a simple list of locale links
(without entry-specific translation lookup) is enough — users can switch locale from
any page.

```astro
---
import { getMenu } from 'emdash'
import type { SiteDetails } from '../lib/pwb/types'
import { localePath, ALL_LOCALES } from '../lib/locale'

interface Props {
  site: SiteDetails
}

const { site } = Astro.props
const primaryMenu = await getMenu('primary')
const currentLocale = Astro.currentLocale ?? 'en'

const LOCALE_LABELS: Record<string, string> = { en: 'EN', es: 'ES', fr: 'FR' }
---

<header class="site-header">
  <div class="site-header__inner">
    <a href={localePath(currentLocale, '/')} class="site-header__logo">
      {site.logo_url
        ? <img src={site.logo_url} alt={site.company_display_name ?? site.title} height="40" />
        : <span class="site-header__title">{site.company_display_name ?? site.title}</span>
      }
    </a>

    <nav class="site-header__nav" aria-label="Main navigation">
      {primaryMenu?.items.map(item => (
        <a href={localePath(currentLocale, item.url)} target={item.target}>{item.label}</a>
      ))}
    </nav>

    <!-- Locale switcher -->
    <div class="site-header__locales">
      {ALL_LOCALES.map(locale => (
        <a
          href={localePath(locale, '/')}
          class:list={['site-header__locale', { 'site-header__locale--active': locale === currentLocale }]}
          aria-current={locale === currentLocale ? 'page' : undefined}
        >
          {LOCALE_LABELS[locale] ?? locale.toUpperCase()}
        </a>
      ))}
    </div>
  </div>
</header>
```

**Note**: The header locale switcher always links to each locale's homepage (`/`, `/es/`, `/fr/`).
The per-entry `LanguageSwitcher` component on content pages is the right place to link to
the actual translated version of the current page.

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

### `src/pages/rss.xml.ts`

The current RSS feed doesn't filter by locale. After adding i18n, it will mix content from
all locales in one feed. Options:

**Option A (simplest)**: Filter to default locale only.
```typescript
const posts = await getEmDashCollection("posts", { locale: 'en', status: 'published' })
```

**Option B (comprehensive)**: One feed per locale at `/rss.xml` (en), `/es/rss.xml`, `/fr/rss.xml`.
Create `src/pages/[lang]/rss.xml.ts` alongside the default feed.

**Recommendation**: Start with Option A. Add locale-specific feeds if users request them.

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

Work in this exact order to keep the site functional throughout:

1. **`src/lib/locale.ts`** — No side effects, needed by everything else.
2. **`astro.config.mjs`** — Add i18n block. Site still works; `Astro.currentLocale` is now set.
3. **Modify default-locale pages** — Add `locale` to all `getEmDashEntry` / `getEmDashCollection` calls. Verify site still works (`en` content loads correctly).
4. **`seed/seed.json`** — Add `"locale": "en"` to all existing entries. Re-seed dev DB: `npx emdash seed seed/seed.json`. Verify site still works.
5. **`src/components/LanguageSwitcher.astro`** — Build and test in isolation.
6. **`src/components/SiteHeader.astro`** — Add locale links. Verify header renders correctly.
7. **`src/layouts/Base.astro`** — Add `hreflang` support for blog/CMS pages.
8. **`src/layouts/BaseLayout.astro`** — Only if property pages need the same locale SEO treatment.
9. **Create `[lang]` pages** — Start with `[lang]/index.astro`, verify `/es/` loads. Then add the rest.
10. **Add translated seed content** — Add Spanish/French entries to `seed/seed.json`. Re-seed.
11. **RSS feed** — Filter to default locale.
12. **Test end-to-end** — `/`, `/es/`, `/posts/welcome`, `/es/posts/bienvenido`.

---

## Testing Checklist

After each phase, verify:

- [ ] Default locale (`/`) loads and shows correct content
- [ ] Non-default locale (`/es/`) loads and shows correct content (or 404 if no content seeded)
- [ ] `Astro.currentLocale` is correct on each page type (log it during dev)
- [ ] PWB properties pages use the right locale in API calls (check network tab)
- [ ] Language switcher links are correct on content pages
- [ ] Header locale links navigate correctly
- [ ] Search only returns results for the current locale
- [ ] RSS feed only includes default-locale content
- [ ] `hreflang` tags appear in `<head>` on content pages (check page source)
- [ ] Missing translations behave intentionally: either direct 404 or explicit app-level fallback, depending on the chosen product rule

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
