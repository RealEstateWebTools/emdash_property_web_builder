# Architecture Overview

## What this project is

`emdash_property_web_builder` is an **Astro site** that acts as a property agency frontend. It is a hybrid system with two distinct backends:

| Concern | Handled by |
|---|---|
| Property listings, search, enquiries | **PWB** (PropertyWebBuilder) — existing Rails app |
| Site copy, hero text, CMS pages | **EmDash** — embedded SQLite/D1 CMS |

The Astro site is deployed to **Cloudflare Workers** (via `@astrojs/cloudflare`). Every page is server-rendered on each request.

---

## How the two backends fit together

```
Browser
  │
  ▼
Astro page (Cloudflare Worker)
  │
  ├──► EmDash (D1 database)
  │      Landing page hero text, CMS pages, menus
  │      Edited via /_emdash/admin
  │
  └──► PWB Rails API (api_public/v1/:locale/...)
         Property listings, search, detail pages
         Enquiry form submissions
         Site details (title, logo, SEO, analytics)
```

A typical page (e.g. the homepage) makes **parallel** requests to both:

```typescript
const [homepage, site, results] = await Promise.all([
  getEmDashEntry('pages', 'homepage'),    // EmDash: hero copy
  client.getSiteDetails(),                 // PWB: site title, logo, OG tags
  client.searchProperties({ featured: 'true', per_page: 6 }), // PWB: listings
])
```

---

## Directory structure

```
emdash_property_web_builder/
│
├── astro.config.mjs          Astro + EmDash integration config
│                             Dev: SQLite + local storage
│                             Prod: Cloudflare D1 + R2
│
├── wrangler.jsonc            Cloudflare deployment config (D1, R2 bindings)
├── seed/seed.json            EmDash schema + demo content
├── data.db                   Local SQLite database (gitignored, dev only)
├── uploads/                  Local media uploads (gitignored, dev only)
│
├── src/
│   ├── live.config.ts        EmDash content collection loader (boilerplate)
│   │
│   ├── lib/pwb/              PWB API layer (all pure TypeScript, fully tested)
│   │   ├── types.ts          TypeScript interfaces for every PWB API response
│   │   ├── client.ts         PwbClient class — all fetch calls live here
│   │   ├── site-config.ts    buildPageMeta — assembles <head> SEO data
│   │   ├── search-params.ts  URL ↔ PWB API parameter mapping
│   │   ├── formatters.ts     formatPropertyCard — shapes listing tile data
│   │   ├── detail-formatter.ts  formatPropertyDetail — shapes detail page data
│   │   └── enquiry-validator.ts  Client-side form validation
│   │
│   ├── components/
│   │   ├── SiteHeader.astro
│   │   ├── PropertyCard.astro    Single listing tile
│   │   ├── PropertyGrid.astro    Responsive grid of tiles
│   │   ├── SearchBar.astro       Filter form (type, beds, price, sort)
│   │   ├── MapView.astro         Leaflet map with PWB map_markers
│   │   ├── PropertyDetail.astro  Full detail view (gallery, specs, description)
│   │   ├── SimilarProperties.astro
│   │   └── ContactForm.astro     Enquiry form → PWB /enquiries endpoint
│   │
│   ├── layouts/
│   │   └── BaseLayout.astro  HTML shell: SEO meta, OG, analytics, theme CSS
│   │
│   ├── pages/
│   │   ├── index.astro           Homepage (EmDash hero + PWB featured listings)
│   │   ├── properties/
│   │   │   ├── index.astro       Search/listing page
│   │   │   └── [slug].astro      Property detail page
│   │   └── [...slug].astro       CMS catch-all (fetches PWB /localized_page/by_slug)
│   │
│   └── test/
│       ├── setup.ts              MSW server lifecycle
│       ├── fixtures/             Static JSON snapshots of PWB API responses
│       └── mocks/pwb-server.ts   MSW mock — intercepts all PwbClient fetch calls
│
└── public/styles/
    ├── theme.css             CSS custom properties + all component styles
    └── palettes/             Color palette overrides (default.css, gold.css)
```

---

## PWB API — localized endpoints

The PWB API client (`src/lib/pwb/client.ts`) uses a **locale prefix** on all data endpoints:

```
/api_public/v1/:locale/site_details
/api_public/v1/:locale/properties           (search)
/api_public/v1/:locale/properties/:slug     (detail)
/api_public/v1/:locale/search/facets
/api_public/v1/:locale/search/config
/api_public/v1/:locale/localized_page/by_slug/:slug
```

Non-data endpoints (enquiries) use the base path without locale:
```
POST /api_public/v1/enquiries
```

The `PwbClient` constructor takes `(baseUrl, locale = 'en')`. The `createPwbClient(locale)` factory reads `PWB_API_URL` from the environment.

---

## EmDash — what lives in the CMS

Only **site copy** lives in EmDash. Property data never does.

| Collection | Entries | Purpose |
|---|---|---|
| `pages` | `homepage` | Landing page hero title + tagline (inline-editable) |
| `pages` | `about` | About page body copy |
| `posts` | 7 demo posts | Blog/news (from original blog template — can be removed) |

Editors access content at `http://localhost:4321/_emdash/admin`.

Click-to-edit works on the live frontend when an admin is logged in — elements with `{...entry.edit.fieldName}` spread attributes trigger an inline editor on click.

---

## Theming

All visual design uses **CSS custom properties** defined in `public/styles/theme.css`. No Tailwind, no Bootstrap.

Palette swapping: load a different `public/styles/palettes/<name>.css` file to override the color variables. Currently: `default` and `gold`.

The active palette can eventually be driven by PWB's `/theme` and `/theme_palettes` endpoints (not yet wired up).
