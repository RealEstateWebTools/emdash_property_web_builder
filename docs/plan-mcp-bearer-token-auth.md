# Plan: MCP Bearer-Token Auth & Content Operations

## Current State

`mcp: true` is set in `astro.config.ts`. The deployed Worker exposes an MCP server at
`/_emdash/api/mcp`, protected by OAuth bearer-token auth (verified in `docs/remote-content-and-mcp.md`).

The `pwb-mcp-content` skill exists and documents the auth behavior and content ownership split.

EmDash content today:
- Homepage hero, blog archive, search → **EmDash**
- Property listings, catch-all CMS pages → **PWB backend** (not yet EmDash)

## What MCP Enables

With a valid bearer token, Claude Code can:
- Read and write EmDash content without opening the admin UI
- Create/publish blog posts, update site settings, manage taxonomies
- Perform bulk content operations or migrations via natural language

## Tasks

### 1. Obtain a Bearer Token

Bearer tokens are generated from the EmDash admin. The user must do this manually:

1. Log in at `https://<your-worker>/_emdash/admin`
2. Navigate to Settings → API Tokens (or equivalent)
3. Generate a token with `content:read content:write media:read media:write` scopes
4. Store it as `EMDASH_MCP_TOKEN` in `.dev.vars` (local) and the Worker's secret store (production)

> **Never paste the token into this conversation.** Use `! echo $EMDASH_MCP_TOKEN` to confirm it's set locally.

### 2. Wire Token into Claude Code

Add the MCP server to `.claude/settings.json` (project-local) so the `pwb-mcp-content` skill
can authenticate:

```json
{
  "mcpServers": {
    "emdash-pwb": {
      "url": "https://<your-worker>/_emdash/api/mcp",
      "headers": {
        "Authorization": "Bearer ${EMDASH_MCP_TOKEN}"
      }
    }
  }
}
```

### 3. Expand Content Coverage

The highest-value gap is the catch-all route (`src/pages/[...slug].astro`) still reading from
the PWB backend rather than EmDash. Once MCP is authenticated, use it to:

- Migrate static pages (About, Contact) to EmDash
- Update the catch-all route to query EmDash `pages` collection first, fallback to PWB
- Publish and verify content via MCP rather than the admin UI

### 4. Ongoing Workflow

Use the `pwb-mcp-content` skill for:
- Creating blog posts and applying taxonomies
- Updating homepage hero and trust content
- Verifying published content matches the live Worker

## Risks

- Token expiry: document rotation process before go-live
- Scope creep: keep property listings in PWB backend; don't migrate prematurely
- Route ownership: unifying the catch-all is a prerequisite for full MCP-driven content

## Related Files

- `src/pages/[...slug].astro` — catch-all route (currently PWB-backed)
- `src/pages/[lang]/[...slug].astro` — i18n variant
- `docs/remote-content-and-mcp.md` — verified endpoint and OAuth discovery details
- `.agents/skills/pwb-mcp-content.md` — skill playbook
