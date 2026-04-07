This is an EmDash site -- a CMS built on Astro with a full admin UI.

## Commands

```bash
npx emdash dev        # Start dev server (runs migrations, seeds, generates types)
npx emdash types      # Regenerate TypeScript types from schema
npx emdash seed seed/seed.json --validate  # Validate seed file
```

The admin UI is at `http://localhost:4321/_emdash/admin`.

## Key Files

| File                     | Purpose                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `astro.config.mjs`       | Astro config with `emdash()` integration, database, and storage                  |
| `src/live.config.ts`     | EmDash loader registration (boilerplate -- don't modify)                         |
| `seed/seed.json`         | Schema definition + demo content (collections, fields, taxonomies, menus, widgets) |
| `emdash-env.d.ts`      | Generated types for collections (auto-regenerated on dev server start)             |
| `src/layouts/Base.astro` | Base layout with EmDash wiring (menus, search, page contributions)               |
| `src/pages/`             | Astro pages -- all server-rendered                                                 |

## Skills

Agent skills are in `.agents/skills/`. Load them when working on specific tasks:

- **building-emdash-site** -- Querying content, rendering Portable Text, schema design, seed files, site features (menus, widgets, search, SEO, comments, bylines). Start here.
- **creating-plugins** -- Building EmDash plugins with hooks, storage, admin UI, API routes, and Portable Text block types.
- **emdash-cli** -- CLI commands for content management, seeding, type generation, and visual editing flow.

## Rules

- All content pages must be server-rendered (`output: "server"`). No `getStaticPaths()` for CMS content.
- Image fields are objects (`{ src, alt }`), not strings. Use `<Image image={...} />` from `"emdash/ui"`.
- `entry.id` is the slug (for URLs). `entry.data.id` is the database ULID (for API calls like `getEntryTerms`).
- Always call `Astro.cache.set(cacheHint)` on pages that query content.
- Taxonomy names in queries must match the seed's `"name"` field exactly (e.g., `"category"` not `"categories"`).

## Non-Negotiable Safety Rules

These rules exist because mistakes here cause real damage — exposed secrets, broken deployments, wasted time on a critical project.

### Never Guess Configuration

**If you do not know the exact name of an environment variable, CLI flag, or config key — stop. Look it up first.**

- Read the source: check `npx <tool> --help`, fetch the upstream skill/docs, or grep the codebase.
- If you cannot find it, say "I don't know — here is how to find it" and provide the lookup path.
- Do not guess and qualify it with "I think" or "probably". A wrong guess is worse than no answer.

### Never Generate or Display Secrets

**Never run commands that produce secrets, tokens, passwords, or private keys via your tools.** The output appears in the conversation log, which may be stored, synced, or seen by others.

- If a secret needs to be generated, instruct the user to run the command themselves in their own terminal.
- Never suggest copy-pasting a secret value you have seen or generated.
- If you accidentally expose a secret, immediately tell the user it is compromised and must be regenerated.

## Documentation Rules

**Always derive docs from the code, never from memory or templates.**

- **Before writing any deployment docs**, read `package.json` and document the script as `pnpm run deploy`, not the raw underlying command. Note: in a pnpm workspace, `pnpm deploy` is a reserved built-in — always use `pnpm run <script>` to invoke scripts unambiguously.
- **Never use `wrangler pages` commands in docs.** This project deploys as a Cloudflare Worker (`wrangler deploy`). Using Pages commands will cause the wrong deployment type.
- **Docs must pass `pnpm run test:run -- src/docs-validation.test.ts`.** This test validates that all `pnpm <script>` commands in docs exist in `package.json` and that no `wrangler pages` commands appear. Run it after editing docs.
- When you add a new `pnpm` script to `package.json`, you can reference it in docs. If you remove or rename a script, update any docs that reference it — the test will catch mismatches.
