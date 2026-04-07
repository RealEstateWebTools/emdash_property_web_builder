---
name: pwb-mcp-content
description: Add and manage property-web-builder editorial content via the deployed EmDash MCP server. Use when you need to inspect remote content state, update the homepage hero, create blog posts, apply taxonomies, or verify published content on the live Worker deployment. Covers auth behavior, content ownership split, exact playbook prompts, and payload format.
---

# PWB MCP Content

This skill covers remote content operations against the deployed EmDash site at:

```
https://emdash-property-web-builder.etewiah.workers.dev
```

The MCP server is at `/_emdash/api/mcp`. It is OAuth-protected and requires browser-based auth (device-code CLI login is currently broken for this deployment — see Known Issues).

## Content Ownership — Read This First

The site has a **split content model**. Not all editorial-looking pages are backed by EmDash.

| Content | Source | Public routes improved by EmDash writes |
|---|---|---|
| Homepage hero | EmDash `pages` collection, slug `homepage` | `/` |
| Blog archive + posts | EmDash `posts` collection | `/posts`, `/posts/:slug` |
| Search | EmDash `posts` collection | `/search` |
| Taxonomy archives | EmDash taxonomies | `/category/:slug`, `/tag/:slug` |
| Generic CMS pages (About, Contact, etc.) | **PWB backend** (not EmDash) | — |

**Do not create EmDash `about` or `contact` page entries expecting them to appear on the live site.** The catch-all route `src/pages/[...slug].astro` resolves those from the PWB backend. That is a routing decision in code, not a content gap.

## Authentication

The MCP endpoint is an OAuth-protected resource.

- **Browser login works.** Use a browser-capable MCP client that supports authorization code + PKCE (`S256`).
- **CLI device-code login is broken.** `npx emdash login --url ...` connects but prints `undefined` for the verification URL and times out. Do not rely on it.
- The admin UI at `/_emdash/admin/login` is healthy (Passkey, GitHub, Google, email-link).

OAuth metadata endpoints for reference:
- Protected resource: `/.well-known/oauth-protected-resource`
- Authorization server: `/_emdash/.well-known/oauth-authorization-server`

## Workflow

### Step 1 — Inspect before writing

Always run an inspection prompt first. Never write without knowing the current state.

```text
Inspect the remote EmDash site at https://emdash-property-web-builder.etewiah.workers.dev/_emdash/api/mcp and do not write anything yet.

1. List the available tools.
2. List the collections, fields, taxonomies, menus, widget areas, and site settings.
3. Count current entries in `pages` and `posts`.
4. Show whether a `homepage` entry exists in `pages`.
5. Show whether any published posts exist.
6. Summarize what is safe to edit remotely.
```

### Step 2 — Update site settings and homepage

Run this after inspection confirms the state matches expectations:

```text
Update the EmDash `pages` entry with slug `homepage`.

Set these fields:
- title: Find Your Next Move
- featured_section_heading: Featured Properties
- content: Use a concise paragraph explaining that the site helps visitors browse homes for sale and rent, understand local market conditions, and make better property decisions.

Publish the result and then summarize the updated fields.
```

If site settings (title, tagline) are editable via the available tools, update those first using property-specific branding before updating the homepage entry.

### Step 3 — Create blog posts

**Option A: Batch import from prepared payloads**

Six ready-to-import posts are in `docs/mcp-post-payloads.json`. Each payload includes `collection`, `slug`, `status`, `data.title`, `data.excerpt`, `data.content` (markdown — EmDash converts it to Portable Text automatically), `bylines`, and `taxonomies`.

```text
Create the six published posts defined in docs/mcp-post-payloads.json.

Requirements:
1. Use each object in the `posts` array as the source payload.
2. Create entries in the `posts` collection with the provided slug, data, bylines, and taxonomies.
3. Publish each item.
4. If featured media upload is not supported by the available tools, continue without adding images.
5. Return a table of created slugs, titles, and final status.
```

> Note: the prompt above assumes your MCP client also has filesystem access. If it does not, paste the JSON payloads directly.

**Option B: Test with a single post first**

```text
Create one published post in the `posts` collection using the payload in docs/mcp-post-payloads.json whose slug is `local-property-market-outlook-2026`.

After creation:
1. Confirm the stored title, slug, and publication status.
2. Confirm the assigned categories and tags.
3. Tell me which public URL to verify.
```

**Option C: Generate new posts**

When generating new property-market posts, use this brief:

```text
Populate this EmDash property site with relevant editorial content for a real-estate audience.

Constraints:
- Focus on the `posts` collection.
- Do not create About or Contact pages — those are not EmDash-backed on this deployment.
- Use existing taxonomies where they match (see taxonomy reference below).
- Tone: practical, local, credible, agent-led — not generic lifestyle copy.
- All posts must be published, not drafts.

Tasks:
1. Create 6 published posts in the `posts` collection with excerpts, structured headings, and useful real-estate advice.
2. Assign appropriate categories and tags from the existing taxonomy.
3. If media upload is supported, add a featured image with specific alt text to each post.
4. List the created slugs and public routes to verify.
```

### Step 4 — Verify

```text
Verify the remote content changes.

1. Count published posts in the `posts` collection.
2. Fetch the `homepage` entry and summarize its current title and hero copy.
3. List the post slugs that were just created.
4. Confirm which taxonomy terms are now in use by those posts.
5. Suggest the public routes I should open to verify the result.
```

Public routes to check after writes:
- `/` — homepage hero
- `/posts` — blog archive (should show post count > 0)
- `/posts/:slug` — individual post
- `/search` — search page
- `/category/:slug` — category archive
- `/tag/:slug` — tag archive

## Taxonomy Reference

Use these existing terms from `seed/seed.json`. Do not invent new taxonomy structure until the editorial model is stable.

**Categories:** `market-news`, `buying-guides`, `selling-tips`, `renting`, `lifestyle`

**Tags:** `first-time-buyer`, `investment`, `mortgage`, `property-tips`, `local-area`

## Content Brief — What This Site Covers

Target audiences: buyers, sellers, landlords, renters in a local UK property market.

Good post topics:
- Local market outlook and pricing trends
- Renting vs buying cost comparisons
- Pre-sale preparation and valuation advice
- How to read listings and floor plans
- Neighbourhood quality signals beyond the postcode
- Mortgage and deposit planning

Avoid: generic lifestyle content unrelated to property, national macroeconomic commentary without local grounding, AI-sounding filler.

## Known Issues

| Issue | Status |
|---|---|
| `npx emdash login --url ...` device-code flow broken (prints `undefined`, times out) | Use browser-authenticated MCP client instead |
| Generic CMS pages (About, Contact) not routed through EmDash | By design — `[...slug].astro` uses PWB backend |
| CLI path for taxonomy/byline metadata requires separate commands after content create | Known limitation — use MCP client where possible |

## Related Files

- `docs/remote-content-and-mcp.md` — Full verification findings and auth behavior
- `docs/mcp-post-payloads.json` — Six ready-to-import post payloads
- `docs/troubleshooting.md` — CLI device-code timeout entry
- `docs/development-guide.md` — Remote content section
- `seed/seed.json` — Taxonomy definitions (categories, tags, bylines)
- `src/pages/index.astro` — Homepage (reads EmDash `pages/homepage`)
- `src/pages/posts/index.astro` — Blog archive (reads EmDash `posts`)
- `src/pages/[...slug].astro` — Catch-all route (reads PWB backend, not EmDash)
