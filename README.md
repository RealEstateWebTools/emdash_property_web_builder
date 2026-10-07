# EmDash Property Web Builder

An estate agency website built with [EmDash](https://github.com/emdash-cms/emdash) and
[Property Web Builder](https://github.com/etewiah/property_web_builder),
deployed on Cloudflare Workers.

Property listings, search, and enquiries come from the PWB Rails backend. Site content,
blog content, admin UI, and editor workflows come from EmDash.

## Demo

Live demo deployment:

- [emdash-property-web-builder.etewiah.workers.dev](https://emdash-property-web-builder.etewiah.workers.dev/)

## What This Repo Includes

- property search and detail pages powered by PWB
- EmDash-managed CMS pages and blog content
- EmDash admin UI for content editing
- a PWB properties admin plugin
- a PWB property embed plugin for inserting live listings into rich content
- a PWB valuation plugin workspace package
- MCP support via EmDash for AI-assisted workflows
- Cloudflare Workers deployment with D1 and R2

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/RealEstateWebTools/emdash_property_web_builder)

## Architecture

- **Frontend:** Astro
- **CMS/admin:** EmDash
- **Listings backend:** Property Web Builder (Rails API)
- **Production runtime:** Cloudflare Workers
- **Production database:** Cloudflare D1
- **Production media storage:** Cloudflare R2
- **Local database:** SQLite (`./data.db`)
- **Local media storage:** filesystem (`./uploads`)

The split is intentional:

- PWB is the source of truth for listings and property search
- EmDash is the source of truth for editorial content and admin workflows

## Main Routes

| Route | Purpose |
|---|---|
| `/` | Homepage |
| `/properties` | Property search |
| `/properties/:slug` | Property detail |
| `/posts` | Blog archive |
| `/posts/:slug` | Blog post |
| `/pages/:slug` | CMS page |
| `/_emdash/admin` | EmDash admin |
| `/_emdash/api/mcp` | EmDash MCP endpoint |

## Local Development

### Prerequisites

- Node.js 22.12.0+ (use a maintained release satisfying dependency engine requirements)
- pnpm 10.28.0 (the version pinned in `package.json`)
- optionally, a running PWB backend; native EmDash listings work without it

### Setup

```bash
pnpm install
cp .env.example .env
```

To use a PWB backend for listings, set `PWB_API_URL` in `.env`, for example:

```bash
PWB_API_URL=http://localhost:3000
```

Without it, the site runs entirely on EmDash: listings come from the Properties
collection (import them from PWB with `pnpm import:pwb-listings`). See
[docs/pwb-optional.md](docs/pwb-optional.md).

Seed the local database:

```bash
npx emdash seed seed/seed.json
```

### Start the app

Preferred development command:

```bash
pnpm dev
```

This wrapper starts `astro dev` and opens the dev-bypass admin URL
automatically.

Important local URLs:

- site: [http://localhost:4321](http://localhost:4321)
- admin: [http://localhost:4321/_emdash/admin](http://localhost:4321/_emdash/admin)
- admin bypass: [http://localhost:4321/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin](http://localhost:4321/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin)

If you want the plain Astro dev server without the wrapper, you can also run:

```bash
npx astro dev
```

That runs on port `4321` by default.

## Common Commands

```bash
pnpm dev                  # wrapper around astro dev on port 4321
npx astro dev             # plain dev server (no browser auto-open)
npx emdash seed seed/seed.json
pnpm export:d1-sql
pnpm sync:prod-db
pnpm reset:admin-access
pnpm test
pnpm test:run
pnpm build
pnpm run deploy
```

## Current Plugin Work

This repo now contains several PWB-related plugin efforts:

- [docs/plugin-release-readiness.md](docs/plugin-release-readiness.md)
  Directory eligibility, release blockers, verification evidence, and preparation plan.

- [docs/pwb-properties-plugin.md](docs/pwb-properties-plugin.md)
  Read-only PWB properties admin plugin.
- [docs/pwb-properties-plugin-write-capable.md](docs/pwb-properties-plugin-write-capable.md)
  Planned write-capable architecture for listing editing.
- [docs/pwb-properties-content-embedding.md](docs/pwb-properties-content-embedding.md)
  Property embedding inside Portable Text content.
- [docs/pwb-valuation-plugin.md](docs/pwb-valuation-plugin.md)
  Valuation plugin work.

## EmDash Patch Workflow

This repository carries a local `pnpm` patch for `emdash@1.1.0` to preserve Portable Text
plugin block keys during inline-editor roundtrips. Upstream 1.1 already preserves custom
attributes; the patch also fixes locale-aware recent-post links.

That patch is tracked here:

- [patches/emdash@1.1.0.patch](patches/emdash@1.1.0.patch)

Background and maintenance notes are documented here:

- [docs/emdash-plugin-block-attr-patch.md](docs/emdash-plugin-block-attr-patch.md)

## Deployment

### One-click deploy

Use the Cloudflare deploy button above.

After deployment, configure the PWB backend URL:

```bash
wrangler secret put PWB_API_URL
```

You will also need to configure your real D1 and R2 resources in
[wrangler.jsonc](wrangler.jsonc).

### Manual deploy

```bash
pnpm build
pnpm run deploy
```

If you need to push the local SQLite CMS database into remote D1, use the repo script:

```bash
pnpm sync:prod-db
```

For a preview without making changes:

```bash
pnpm sync:prod-db --dry-run
```

Recommended "replace remote content with local content" flow:

```bash
pnpm sync:prod-db --backup --force-reset
```

That will:

- back up the current remote D1 database first
- clear remote table data
- import local data into the existing remote schema

If production admin access is lost because passkey state no longer matches the deployed DB, use:

```bash
pnpm reset:admin-access
```

That backs up the remote auth/setup tables, clears admin login state, and reopens the setup flow at:

- all rows in the affected auth tables are deleted, including all rows in `users`

- [https://emdash-property-web-builder.etewiah.workers.dev/_emdash/admin/setup](https://emdash-property-web-builder.etewiah.workers.dev/_emdash/admin/setup)

For production deploys, also review:

- `DB` D1 binding
- `MEDIA` R2 binding
- `PWB_API_URL` secret
- optional `PUBLIC_PALETTE` theme var

## Key Docs

- [docs/development-guide.md](docs/development-guide.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/troubleshooting.md](docs/troubleshooting.md)
- [docs/admin-access-recovery.md](docs/admin-access-recovery.md)
- [docs/remote-content-and-mcp.md](docs/remote-content-and-mcp.md)
- [docs/product-roadmap.md](docs/product-roadmap.md)

## Notes

- changes to plugin registration or `astro.config.mjs` usually require a full dev server restart
- `emdash-env.d.ts` is generated
- with `PWB_API_URL` set, PWB must be reachable for live property pages and property embeds to resolve fully; without it, listings come from EmDash (docs/pwb-optional.md)
