# Development Guide

## Prerequisites

- Node.js >= 18
- pnpm >= 10
- A running PWB Rails backend (local or staging)

---

## First-time setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy and fill in the environment file
cp .env.example .env
# Edit .env: set PWB_API_URL=http://localhost:3000

# 3. Bootstrap the local database and seed demo content
npx emdash seed seed/seed.json

# 4. Start the dev server
npx emdash dev
# → http://localhost:4321
# → http://localhost:4321/_emdash/admin
```

---

## Daily development

### Starting the dev server

Always use `npx emdash dev`, not `pnpm dev` or `pnpm astro dev`.

`emdash dev` runs migrations before starting Astro, which ensures the database schema matches the current codebase. Plain `astro dev` skips this step.

```bash
npx emdash dev
```

### Running tests

```bash
pnpm test:run        # single run
pnpm test            # watch mode
pnpm test:coverage   # with coverage report
```

Tests use [Vitest](https://vitest.dev/) + [MSW](https://mswjs.io/). The MSW mock server intercepts all `fetch()` calls made by `PwbClient` — no real PWB backend is needed to run the test suite.

---

## Local database

### How it works

In development (`NODE_ENV !== 'production'`), the site uses:
- **Database:** SQLite at `./data.db`
- **Media storage:** local filesystem at `./uploads/`

In production (Cloudflare Workers), it uses:
- **Database:** Cloudflare D1 (binding: `DB`)
- **Media storage:** Cloudflare R2 (binding: `MEDIA`)

This split exists because `npx emdash seed` can only write to SQLite. Using SQLite locally keeps seeding and the dev server in sync.

### Re-seeding

```bash
npx emdash seed seed/seed.json
```

This is **safe to re-run** — existing entries are skipped (seed uses upsert logic based on `id`). Run it whenever you add new content entries to `seed/seed.json`.

### Resetting the database

Delete `data.db` and re-seed:

```bash
rm data.db && npx emdash seed seed/seed.json
```

### Generating TypeScript types

After changing the schema in `seed/seed.json`, regenerate `emdash-env.d.ts`:

```bash
npx emdash types
```

Or just restart the dev server — it regenerates types automatically on startup.

---

## Adding editable content to a page

To make a new section of a page editable in the EmDash admin:

### 1. Add a content entry to `seed/seed.json`

```json
"content": {
  "pages": [
    {
      "id": "my-page",
      "slug": "my-page",
      "status": "published",
      "data": {
        "title": "My Page Heading",
        "content": [...]
      }
    }
  ]
}
```

### 2. Re-seed

```bash
npx emdash seed seed/seed.json
```

### 3. Query in the Astro page

```astro
---
import { getEmDashEntry } from 'emdash'
import { PortableText } from 'emdash/ui'

const { entry, cacheHint } = await getEmDashEntry('pages', 'my-page')
Astro.cache.set(cacheHint)  // required for cache invalidation on publish
---

<h1 {...entry?.edit.title}>{entry?.data.title}</h1>
<div {...entry?.edit.content}>
  <PortableText value={entry?.data.content} />
</div>
```

The `{...entry.edit.fieldName}` spreads `data-emdash-*` attributes that activate click-to-edit when an admin is logged in.

**Important:** Always call `Astro.cache.set(cacheHint)` — without it, published changes won't invalidate the cache and editors will see stale content.

---

## Editing the navigation menu

The site header nav is driven by the EmDash **Primary Navigation** menu — it is not hardcoded.

**To edit it in the admin:** go to `/_emdash/admin` → **Menus** → **Primary Navigation**. You can add, remove, and reorder items there without touching code.

**Note:** Menu URLs must point to existing routes. CMS pages live at `/pages/<slug>` (e.g. `/pages/about`, `/pages/contact`), not bare `/about`. The bare paths `/about` and `/contact` are handled by a PWB catch-all and will 404 if the page doesn't exist there.

**To change the seed defaults** (i.e. what gets populated on a fresh database), edit the `"menus"` array in `seed/seed.json`:

```json
"menus": [
  {
    "name": "primary",
    "label": "Primary Navigation",
    "items": [
      { "type": "custom", "label": "Home", "url": "/" },
      { "type": "custom", "label": "Properties for Sale", "url": "/properties" }
    ]
  }
]
```

Then re-seed: `npx emdash seed seed/seed.json`

**How it works:** `SiteHeader.astro` calls `getMenu('primary')` from `emdash` and renders whatever items are stored in the database. The menu name `"primary"` must match the seed's `"name"` field exactly.

---

## Layout conventions

There are two layouts:

| Layout | Used by | Header |
|---|---|---|
| `BaseLayout.astro` | Home, properties, and CMS pages | `SiteHeader.astro` — property-site style, logo + nav from PWB site data |
| `Base.astro` | Posts and EmDash blog content | Blog-style nav with search, theme switcher, admin link |

**CMS pages (`/pages/[slug]`) use `BaseLayout.astro`** so the header is consistent with the rest of the site. They still use EmDash's `getEmDashEntry` for content and support visual editing attributes — they just don't include the EmDash admin toolbar overlay.

If you add a new page type that should match the property-site look, use `BaseLayout.astro` and fetch `site` via `createPwbClient().getSiteDetails()`.

### Not-found route convention

For dynamic routes, do not use `Astro.redirect('/404')` as the missing-content path.

Instead:

1. set `Astro.response.status = 404`
2. render a direct not-found response from the route itself
3. for routes that depend on `BaseLayout.astro`, use the shared fallback site object in `src/lib/pwb/fallback-site.ts` if the PWB backend is unavailable

Why this matters: redirecting missing routes to `/404` can create redirect loops on some deployments and can also trigger unnecessary `site_details` calls to the PWB backend, which adds noisy Worker errors when that backend is down.

---

## Adding a new PWB API endpoint

All PWB API calls go through `src/lib/pwb/client.ts`. Always follow the Red-Green TDD pattern:

### 1. Add the mock handler in `src/test/mocks/pwb-server.ts`

```typescript
http.get(`${BASE}/:locale/testimonials`, () => HttpResponse.json(testimonialsFixture)),
```

### 2. Add a fixture in `src/test/fixtures/testimonials.json`

Copy a real response from the PWB API or write a representative sample.

### 3. Write a failing test in `client.test.ts`

```typescript
describe('PwbClient.getTestimonials', () => {
  it('returns a list of testimonials', async () => {
    const result = await client.getTestimonials()
    expect(result).toHaveLength(2)
    expect(result[0].author_name).toBe('Jane Smith')
  })
})
```

### 4. Add the method to `client.ts`

```typescript
async getTestimonials(): Promise<Testimonial[]> {
  return this.get<Testimonial[]>('/testimonials', undefined, true)
}
```

Add the TypeScript type to `src/lib/pwb/types.ts` if it doesn't exist yet.

---

## PWB API reference

All endpoints use the localized base: `/api_public/v1/:locale/`

| Method | Path | Description |
|---|---|---|
| GET | `/site_details` | Site config, SEO tags, analytics IDs, logo |
| GET | `/properties` | Paginated property search + map markers |
| GET | `/properties/:slug` | Single property detail |
| GET | `/search/facets` | Filter counts (type, beds, price ranges) |
| GET | `/search/config` | Available filter options |
| GET | `/localized_page/by_slug/:slug` | CMS page by slug |
| POST | `/enquiries` (no locale) | Submit an enquiry |

**Tenant scoping:** PWB resolves the tenant automatically from the `Host` header. No tenant ID needed in requests.

---

## CORS

The PWB Rails app (`config/initializers/cors.rb`) is already configured to allow:
- `http://localhost:4321` (Astro dev server)
- `*.workers.dev` (Cloudflare Workers deployments)
- `*.pages.dev` (Cloudflare Pages preview deployments)
- `ENV['EMFRONT_ORIGIN']` (production custom domain — set this in the PWB server environment)

---

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `PWB_API_URL` | `.env` (dev), Cloudflare dashboard (prod) | Base URL of the PWB Rails backend, no trailing slash |
| `NODE_ENV` | Set by runtime | `production` switches to D1/R2; anything else uses SQLite/local |
| `EMFRONT_ORIGIN` | PWB server `.env` | Allows the production EmDash domain in PWB's CORS config |

---

## Deployment to Cloudflare

This project deploys as a **Cloudflare Worker** (not Pages). Use `pnpm run deploy:prod` for production deployments — this uses `wrangler.prod.jsonc` which contains your real account-specific resource IDs.

### Why two wrangler config files?

`wrangler.jsonc` is committed to git as a **public template** with placeholder IDs. It must not contain real Cloudflare resource IDs (D1 database UUID, R2 bucket, etc.) because the repo is public.

`wrangler.prod.jsonc` is **gitignored** and holds your real IDs. It also differs from `wrangler.jsonc` in two important ways:
- `main` points to `./dist/server/entry.mjs` (the compiled build output) instead of `./src/worker.ts`
- `no_bundle: true` tells wrangler to upload the pre-built file as-is

This matters because `./src/worker.ts` imports Astro virtual modules that only exist inside the Astro/Vite build pipeline. Running `wrangler deploy` on the source directly would fail with unresolved virtual module errors. The `deploy:prod` script runs `astro build` first to produce the compiled entry point.

### First-time setup

```bash
# 1. Create the production config from the example
cp wrangler.prod.jsonc.example wrangler.prod.jsonc

# 2. Create the D1 database (if it doesn't exist yet)
wrangler d1 create emdash-property-web-builder
# Copy the printed database_id into wrangler.prod.jsonc

# 3. Create the R2 bucket (if it doesn't exist yet)
wrangler r2 bucket create emdash-property-web-builder-media

# 4. Login
wrangler login

# 5. Set the production PWB backend URL
wrangler secret put PWB_API_URL
# (paste the production PWB URL when prompted)
```

### Deploying

```bash
pnpm run deploy:prod
```

After the first deployment, seed the D1 database:

```bash
# Export from local SQLite and import to D1
wrangler d1 execute emdash-property-web-builder --file=<(sqlite3 data.db .dump)
```

Or re-seed manually via the Cloudflare admin panel once the site is live.

---

## Remote content editing via MCP

The deployed Worker exposes an EmDash MCP server at `/_emdash/api/mcp`.

Use this when you want an MCP-capable client or coding agent to inspect and update remote EmDash content without manually working through the admin UI.

### What is safe to edit remotely

Remote EmDash editing currently has the highest impact on:

- site settings
- the homepage hero entry in the EmDash `pages` collection
- blog posts in the EmDash `posts` collection

Do not assume that every CMS-like page is backed by EmDash. The catch-all route in `src/pages/[...slug].astro` currently loads page content from the PWB backend, so generic pages such as About or Contact may not be controlled by EmDash on the live deployment.

### Authentication

The remote MCP endpoint is OAuth-protected. Prefer a browser-capable MCP client that can complete the authorization flow interactively.

During verification, browser login worked, but the current `npx emdash login --url ...` device-code flow did not return a usable verification URL or code for this deployment.

### Suggested workflow

1. Connect your MCP client to `https://emdash-property-web-builder.etewiah.workers.dev/_emdash/api/mcp`.
2. Inspect schema, content counts, taxonomies, menus, and site settings before writing.
3. Update site branding and homepage copy.
4. Create and publish a first batch of high-signal real-estate posts.
5. Verify the public routes `/`, `/posts`, `/search`, and any created `/posts/:slug` pages.

For the detailed findings, the verified auth behavior, and example prompts, see `docs/remote-content-and-mcp.md`.
