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

- Node.js 18+
- pnpm 10+
- a running PWB backend

### Setup

```bash
pnpm install
cp .env.example .env
```

Set `PWB_API_URL` in `.env`, for example:

```bash
PWB_API_URL=http://localhost:3000
```

Seed the local database:

```bash
npx emdash seed seed/seed.json
```

### Start the app

Preferred development command:

```bash
pnpm dev
```

This wrapper starts `npx emdash dev --port 4444` and opens the dev-bypass admin URL
automatically.

Important local URLs:

- site: [http://localhost:4444](http://localhost:4444)
- admin: [http://localhost:4444/_emdash/admin](http://localhost:4444/_emdash/admin)
- admin bypass: [http://localhost:4444/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin](http://localhost:4444/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin)

If you want the raw EmDash dev server instead of the wrapper, you can also run:

```bash
npx emdash dev
```

That typically runs on port `4321`.

## Common Commands

```bash
pnpm dev                  # wrapper around emdash dev on port 4444
npx emdash dev            # direct EmDash dev server
npx emdash seed seed/seed.json
npx emdash types
pnpm test
pnpm test:run
pnpm build
pnpm deploy
```

## Current Plugin Work

This repo now contains several PWB-related plugin efforts:

- [docs/pwb-properties-plugin.md](docs/pwb-properties-plugin.md)
  Read-only PWB properties admin plugin.
- [docs/pwb-properties-plugin-write-capable.md](docs/pwb-properties-plugin-write-capable.md)
  Planned write-capable architecture for listing editing.
- [docs/pwb-properties-content-embedding.md](docs/pwb-properties-content-embedding.md)
  Property embedding inside Portable Text content.
- [docs/pwb-valuation-plugin.md](docs/pwb-valuation-plugin.md)
  Valuation plugin work.

## EmDash Patch Workflow

This repository carries a local `pnpm` patch for `emdash@0.1.0` so Portable Text plugin
blocks can persist arbitrary attributes during editor roundtrips.

That patch is tracked here:

- [patches/emdash@0.1.0.patch](patches/emdash@0.1.0.patch)

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
pnpm deploy
```

For production deploys, also review:

- `DB` D1 binding
- `MEDIA` R2 binding
- `PWB_API_URL` secret
- optional `PUBLIC_PALETTE` theme var

## Key Docs

- [docs/development-guide.md](docs/development-guide.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/troubleshooting.md](docs/troubleshooting.md)
- [docs/remote-content-and-mcp.md](docs/remote-content-and-mcp.md)
- [docs/product-roadmap.md](docs/product-roadmap.md)

## Notes

- `pnpm dev` and `npx emdash dev` are not identical in this repo.
- changes to plugin registration or `astro.config.mjs` usually require a full dev server restart
- `emdash-env.d.ts` is generated
- PWB must be reachable for live property pages and property embeds to resolve fully
