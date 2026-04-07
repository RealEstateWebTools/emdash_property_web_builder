# Remote Content and MCP

This document captures what was verified against the deployed Worker at `https://emdash-property-web-builder.etewiah.workers.dev/`, what that means for content operations, and the recommended workflow for adding useful content remotely.

## Summary

The deployment exposes an EmDash MCP server at `/_emdash/api/mcp`, and that endpoint is protected with OAuth as expected.

The public site is only partially populated from EmDash today:

- the homepage hero is reading EmDash content
- the blog archive and search pages are reading EmDash content
- the featured property cards are coming from the PWB backend
- the catch-all CMS-style page route is currently reading from the PWB backend, not EmDash

That split means the highest-value remote content work is:

1. update EmDash site settings
2. improve the homepage hero entry
3. create and publish blog posts in EmDash
4. avoid spending time on EmDash `about` or `contact` pages until the route ownership is unified

## What Was Verified

### Deployed MCP endpoint

The deployed site advertises an MCP server in the project overview and enables `mcp: true` in the EmDash integration.

- `README.md` lists the MCP server at `/_emdash/api/mcp`
- `astro.config.mjs` enables `mcp: true`

The deployed endpoint responds as an OAuth-protected resource rather than a public endpoint. A direct request to:

```bash
curl -i https://emdash-property-web-builder.etewiah.workers.dev/_emdash/api/mcp
```

returns `401 Not authenticated` with a `WWW-Authenticate: Bearer` challenge pointing to an OAuth protected-resource document.

### OAuth discovery

The protected-resource metadata at:

```text
https://emdash-property-web-builder.etewiah.workers.dev/.well-known/oauth-protected-resource
```

advertises:

- resource: `https://emdash-property-web-builder.etewiah.workers.dev/_emdash/api/mcp`
- authorization server: `https://emdash-property-web-builder.etewiah.workers.dev/_emdash`
- scopes: `content:read`, `content:write`, `media:read`, `media:write`, `schema:read`, `schema:write`, `admin`

The authorization server metadata at:

```text
https://emdash-property-web-builder.etewiah.workers.dev/_emdash/.well-known/oauth-authorization-server
```

advertises a standard OAuth setup with:

- authorization code flow
- refresh tokens
- device code flow
- PKCE (`S256`)

### Browser login behavior

The deployed admin login page is healthy. The browser login UI exposes:

- Passkey
- GitHub
- Google
- email-link sign-in

That confirms the deployment is capable of interactive browser authentication for admin and MCP use.

### CLI login behavior

The EmDash CLI did connect to the site, but the device-code login flow did not return usable verification details for this deployment.

Running:

```bash
npx emdash login --url https://emdash-property-web-builder.etewiah.workers.dev
```

produced a connection success, then printed `undefined` for both the browser URL and device code, and then timed out with `Device code expired (timeout)`.

This should be treated as a tooling or auth-flow issue with the remote CLI path, not as evidence that the deployed admin or MCP server is broken.

## Content Ownership on the Live Site

The codebase does not currently route all editorial-looking pages through the same content source.

### EmDash-managed content

The homepage hero is fetched from the EmDash `pages` collection entry `homepage`:

```ts
const { entry: homepage, cacheHint } = await getEmDashEntry('pages', 'homepage')
```

The blog archive is fetched from the EmDash `posts` collection:

```ts
const { entries: posts, cacheHint } = await getEmDashCollection("posts")
```

That means the following public pages are directly improved by adding EmDash content:

- `/`
- `/posts`
- `/posts/:slug`
- `/search`
- taxonomy pages such as `/category/:slug` and `/tag/:slug`

### PWB-managed content

The catch-all route uses the PWB client:

```ts
client.getPageBySlug(pageSlug)
```

This route lives in `src/pages/[...slug].astro`, so generic pages that look like CMS pages are currently being resolved from the PWB backend, not the EmDash `pages` collection.

That explains why creating or seeding EmDash `pages/about` and `pages/contact` entries does not automatically make `/pages/about` or `/pages/contact` appear on the deployed site if the route is being satisfied elsewhere.

### What the live deployment showed

The deployed site showed these symptoms:

- homepage hero content exists and renders correctly
- featured property cards render correctly
- `/posts` showed `0 articles`
- `/search` used generic blog copy and only searched posts
- `/pages/about` and `/pages/contact` were not available on the deployed site during verification

Taken together, that means the content gap is mostly on the EmDash editorial side, not on the property-listings side.

## Why MCP Is Still the Right Tool

Despite the CLI device-code issue, the deployed MCP server is still the correct remote authoring surface for an agent or MCP-capable client because:

- it is explicitly enabled in the app configuration
- it advertises the correct OAuth metadata
- it exposes write scopes for content, media, schema, and admin operations
- the browser auth path is healthy

The recommended client behavior is to use a browser-based OAuth flow against the remote MCP server rather than relying on the current CLI device-code path.

## Recommended Remote Content Workflow

### 1. Connect an MCP client to the deployed server

Use this server URL:

```text
https://emdash-property-web-builder.etewiah.workers.dev/_emdash/api/mcp
```

Prefer an MCP client that supports browser OAuth and PKCE.

### 2. Inspect before writing

The first MCP prompt should inspect the remote site before changing data. The goal is to confirm the current schema, content counts, menus, taxonomies, and settings.

Suggested prompt:

```text
Inspect the remote EmDash site and do not write anything yet.

1. List the available tools and writable resources.
2. List the existing collections, taxonomies, menus, widget areas, and current content counts.
3. Check whether site settings like title and tagline are editable.
4. Confirm whether the homepage hero comes from the `pages` collection and whether blog content comes from the `posts` collection.
5. Summarize the current gaps before making changes.
```

### 3. Prioritize the right content

Start with these changes:

1. site settings
2. homepage hero copy
3. published blog posts
4. optional featured images and alt text

Delay these until routing is clarified:

1. EmDash `about` page content
2. EmDash `contact` page content
3. any schema expansion for page types not currently surfaced on the live site

### 4. Use a content brief tailored to this site

Suggested write prompt:

```text
Populate this EmDash property site with relevant editorial content for a real-estate audience.

Constraints:
- Focus on the homepage hero and the `posts` collection.
- Do not create generic About or Contact pages unless you confirm the live site uses EmDash for those routes.
- Use the existing taxonomies if they already exist.
- Keep the tone practical, local, credible, and agent-led rather than generic lifestyle copy.
- Prefer published content, not drafts.

Tasks:
1. Update site settings if supported so the site is no longer using generic blog branding.
2. Update the homepage entry in the `pages` collection with stronger real-estate-specific copy.
3. Create 6 published posts in the `posts` collection with excerpts, structured headings, and useful real-estate advice.
4. If media upload is supported, add a relevant featured image to each post with specific alt text.
5. When finished, list the created or updated content and the public routes to verify.
```

### 5. Use prepared payloads for the first post batch

The six proposed posts have been drafted as machine-readable payloads in `docs/mcp-post-payloads.json`.

Each payload includes:

- `collection`
- `slug`
- `status`
- `data.title`
- `data.excerpt`
- `data.content` as markdown for the Portable Text field
- `bylines`
- `taxonomies`

The `content` field is intentionally markdown because EmDash tooling converts markdown strings to Portable Text when the target field is a `portableText` field.

If your MCP client supports content creation with structured JSON input, feed each post object directly into the create tool. If you are using the CLI instead, extract the `data` object and pass it to `npx emdash content create posts --slug <slug> --data '<json>'`, then apply any taxonomy or byline metadata through the tools that support them.

## Editor Playbook

This section gives short, exact prompt patterns for an editor or agent using the deployed MCP server.

### Inspection prompt

Use this first to establish the live state before changing anything:

```text
Inspect the remote EmDash site at https://emdash-property-web-builder.etewiah.workers.dev/_emdash/api/mcp and do not write anything yet.

1. List the available tools.
2. List the collections, fields, taxonomies, menus, widget areas, and site settings.
3. Count current entries in `pages` and `posts`.
4. Show whether a `homepage` entry exists in `pages`.
5. Show whether any published posts exist.
6. Summarize what is safe to edit remotely.
```

### Homepage update prompt

Use this after inspection if the remote state matches the current codebase assumptions:

```text
Update the EmDash `pages` entry with slug `homepage`.

Set these fields:
- title: Find Your Next Move
- featured_section_heading: Featured Properties
- content: Use a concise paragraph explaining that the site helps visitors browse homes for sale and rent, understand local market conditions, and make better property decisions.

Publish the result and then summarize the updated fields.
```

### Batch post creation prompt

Use this to create the first six posts from the prepared JSON payload file:

```text
Create the six published posts defined in docs/mcp-post-payloads.json.

Requirements:
1. Use each object in the `posts` array as the source payload.
2. Create entries in the `posts` collection with the provided slug, data, bylines, and taxonomies.
3. Publish each item.
4. If featured media upload is not supported by the available tools, continue without adding images.
5. Return a table of created slugs, titles, and final status.
```

### Single-post creation prompt

Use this when testing with one post before importing the full batch:

```text
Create one published post in the `posts` collection using the payload in docs/mcp-post-payloads.json whose slug is `local-property-market-outlook-2026`.

After creation:
1. Confirm the stored title, slug, and publication status.
2. Confirm the assigned categories and tags.
3. Tell me which public URL to verify.
```

### Verification prompt

Use this after writes complete:

```text
Verify the remote content changes.

1. Count published posts in the `posts` collection.
2. Fetch the `homepage` entry and summarize its current title and hero copy.
3. List the six newly created post slugs.
4. Confirm which taxonomy terms are now in use by those posts.
5. Suggest the public routes I should open to verify the result.
```

## Editorial Proposals

These are the most relevant first additions for the current deployment.

### Proposed homepage positioning

- Title: `Find Your Next Move`
- Supporting copy: a short paragraph that combines property discovery, local market context, and practical advice
- Featured section heading: keep `Featured Properties`

Reasoning:

- the live homepage already has working property cards
- improving the hero makes the site feel intentional immediately
- this reinforces that the site is both a listings experience and a trusted editorial guide

### Proposed first article batch

Create a first batch of 4 to 6 published posts aimed at buyers, sellers, landlords, and renters.

Recommended topics:

1. `Local Property Market Outlook for 2026: What Buyers and Sellers Should Watch`
2. `Renting vs Buying in 2026: How to Compare the Real Monthly Cost`
3. `Seven Fixes That Add Value Before You Put Your Home on the Market`
4. `How to Read a Property Listing Like a Pro Before Booking a Viewing`
5. `What Makes a Neighbourhood Desirable Beyond the Postcode`
6. `Preparing for a Valuation: What Agents Look For and What Sellers Should Bring`

Reasoning:

- the blog archive and search are currently thin or empty
- these topics match the site’s real-estate use case better than generic blog filler
- they map well to the existing taxonomy terms in `seed/seed.json`

### Proposed taxonomy usage

Use the existing categories and tags from the seed where possible rather than inventing a new taxonomy structure immediately.

Examples:

- categories: `market-news`, `buying-guides`, `selling-tips`, `renting`, `lifestyle`
- tags: `first-time-buyer`, `investment`, `mortgage`, `property-tips`, `local-area`

Reasoning:

- it keeps the first remote import simple
- it makes existing archive pages useful as soon as posts are published
- it avoids schema churn before the editorial model has been exercised on the live deployment

## Operational Recommendations

### For remote editors and agents

- prefer browser-authenticated MCP clients over the current CLI device-code path
- verify content counts before and after writes
- publish content rather than leaving it as drafts unless review workflow is needed

### For the codebase

If you want EmDash to own more of the editorial surface area, the next code decision should be whether `/pages/*` should remain PWB-backed or move to EmDash-backed routing.

Until that is decided, remote content work should avoid assuming all CMS-like pages are writable through EmDash.

## Production Content State (as of 2026-04-07)

The following content has been created and published on the live deployment via the admin API:

| Item | Slug | Status |
|---|---|---|
| Homepage page | `homepage` | Published |
| Post: Local Property Market Outlook | `local-property-market-outlook-2026` | Published |
| Post: Renting vs Buying | `renting-vs-buying-2026-real-monthly-cost` | Published |
| Post: Seven Fixes Before You Sell | `seven-fixes-that-add-value-before-you-sell` | Published |
| Post: How to Read a Listing | `how-to-read-a-property-listing-like-a-pro` | Published |
| Post: Neighbourhood Desirability | `what-makes-a-neighbourhood-desirable-beyond-the-postcode` | Published |
| Post: Preparing for a Valuation | `preparing-for-a-valuation-what-agents-look-for` | Published |

All 5 category terms, 5 tag terms, and 2 bylines (`byline-editorial`, `byline-agent`) are created. **These are not auto-seeded from `seed/seed.json` on the production deployment** — they were created via the API and exist only in the live database.

## Direct Admin API Reference

When an MCP client is not available, use `mcp__claude-in-chrome__javascript_tool` on any admin page to call the API directly from within the authenticated browser session.

### CSRF header (required on all mutations)

```
X-EmDash-Request: 1
```

Without this header, all POST/PUT/PATCH/DELETE requests return `403 CSRF_REJECTED`.

### Verified endpoints

| Action | Method | Path |
|---|---|---|
| Create post | POST | `/_emdash/api/content/posts` |
| Update post + set bylines | PUT | `/_emdash/api/content/posts/:id` |
| Publish post | POST | `/_emdash/api/content/posts/:id/publish` |
| Trash post | POST | `/_emdash/api/content/posts/:id/trash` |
| List posts | GET | `/_emdash/api/content/posts?limit=50` |
| Create category term | POST | `/_emdash/api/taxonomies/category/terms` |
| Create tag term | POST | `/_emdash/api/taxonomies/tag/terms` |
| Assign category | POST | `/_emdash/api/content/posts/:id/terms/category` |
| Assign tag | POST | `/_emdash/api/content/posts/:id/terms/tag` |
| List bylines | GET | `/_emdash/api/admin/bylines?limit=100` |

### Response shape notes

- Create post → `data.item.id` (not `data.post.id`)
- List posts → `data.items[]`
- Taxonomy term list → `data.terms[]`
- Bylines list → `data.items[]`
- Taxonomy term create body uses `label` (not `name`): `{ label: "Market News", slug: "market-news" }`
- Bylines set via PUT body `bylines: [{ bylineId }]` — there is no separate POST byline assignment endpoint

## Authentication: What Works and What Doesn't

| Method | Works? | Notes |
|---|---|---|
| Passkey (real Chrome) | ✅ | Use `mcp__claude-in-chrome` — connects to user's actual browser |
| Passkey (dev-browser) | ❌ | Playwright uses an isolated profile with no system passkeys |
| Email link | ❌ | Email provider not configured on this deployment |
| GitHub / Google OAuth | ✅ | Requires being logged in to those services in the browser |
| CLI device-code | ❌ | Prints `undefined` and times out |

## Known Gaps

- The remote EmDash CLI login flow did not produce a usable device code during verification.
- The README still needs to be read carefully when following deployment steps because this project deploys as a Worker, not Pages.
- The current live site presents a split editorial model, which can confuse editors unless documented.

## Related Files

- `README.md`
- `astro.config.mjs`
- `docs/mcp-post-payloads.json`
- `src/pages/index.astro`
- `src/pages/posts/index.astro`
- `src/pages/[...slug].astro`
- `seed/seed.json`
- `docs/development-guide.md`
- `docs/troubleshooting.md`
