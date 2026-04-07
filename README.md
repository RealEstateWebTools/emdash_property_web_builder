# EmDash Property Web Builder

An estate agency website built with [EmDash](https://github.com/emdash-cms/emdash) and [Property Web Builder](https://github.com/property-web-builder/property_web_builder), deployed on Cloudflare Workers.

Property listings, search, and enquiries are powered by the PWB Rails backend. Site content, pages, articles, and the admin UI are powered by EmDash.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/RealEstateWebTools/emdash_property_web_builder)

## What's Included

- Property listings with search, filters, and map view
- Property detail pages with photo gallery and enquiry form
- Featured properties on homepage
- CMS-managed pages (About, Contact, etc.)
- Blog/articles with categories and tags
- Full-text search
- EmDash admin UI at `/_emdash/admin`
- MCP server at `/_emdash/api/mcp` for AI tool integration

For the verified remote-content workflow, deployed MCP auth behavior, and recommended first content batch, see `docs/remote-content-and-mcp.md`.

## Pages

| Page | Route |
|---|---|
| Homepage | `/` |
| Property search | `/properties` |
| Property detail | `/properties/:slug` |
| Blog archive | `/posts` |
| Single post | `/posts/:slug` |
| Category archive | `/category/:slug` |
| Tag archive | `/tag/:slug` |
| CMS pages | `/pages/:slug` |
| Search | `/search` |
| 404 | fallback |

## Infrastructure

- **Runtime:** Cloudflare Workers
- **Database:** D1 (CMS content and admin)
- **Storage:** R2 (media uploads)
- **Framework:** Astro with `@astrojs/cloudflare`
- **Listings backend:** Property Web Builder (Rails API)

## Prerequisites

You need a running [Property Web Builder](https://github.com/property-web-builder/property_web_builder) instance. This provides the property listings API. Set its URL as `PWB_API_URL` after deploying.

## Local Development

```bash
# Install dependencies
pnpm install

# Copy and fill in environment variables
cp .env.example .env
# Edit .env: set PWB_API_URL=http://localhost:3000

# Seed the local database
npx emdash seed seed/seed.json

# Start the dev server (opens admin automatically)
pnpm dev
# → http://localhost:4444
# → http://localhost:4444/_emdash/admin
```

## Deploying

### One-click via the button above

The deploy button will:
1. Fork this repo to your GitHub account
2. Connect it to Cloudflare Workers
3. Create the D1 database and R2 bucket automatically (`--provision`)

After deploying, set your PWB backend URL:

```bash
wrangler secret put PWB_API_URL
# paste your production PWB URL when prompted
```

Then seed the production database:

```bash
wrangler d1 execute emdash-property-web-builder --file=<(sqlite3 data.db .dump)
```

### Manual deploy

```bash
pnpm build
pnpm run deploy  # runs wrangler deploy --provision
wrangler secret put PWB_API_URL
```

## See Also

- [EmDash documentation](https://github.com/emdash-cms/emdash/tree/main/docs)
- [Property Web Builder](https://github.com/property-web-builder/property_web_builder)
