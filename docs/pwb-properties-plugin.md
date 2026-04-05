# PWB Properties Plugin — Revised Implementation Guide

This document describes a coherent way to build a `pwb-properties` EmDash plugin for this
repo.

The goal is narrow:

- add a read-only **Properties** admin page inside EmDash
- fetch property data from the existing PWB Rails API
- let editors inspect properties without leaving the CMS
- keep PWB as the source of truth for listings

This plugin does not create, edit, or delete properties in EmDash.

---

## Recommended Shape

Treat this as a **standard EmDash plugin** with:

- a descriptor in `src/index.ts`
- runtime logic in `src/sandbox-entry.ts`
- Block Kit admin UI
- one persisted setting: the PWB base URL

That keeps the plugin compatible with EmDash's standard plugin model and avoids mixing in
React admin code unless it becomes necessary later.

---

## Fit With This Repo

This site already uses PWB as the backend for listing/search/detail data and EmDash only
for CMS-managed content.

Relevant existing code:

- `src/lib/pwb/client.ts` contains the current PWB API integration used by Astro pages
- `src/lib/pwb/types.ts` defines the response shapes the site already expects
- `astro.config.mjs` shows how trusted and sandboxed plugins are registered today

The plugin should follow those contracts instead of inventing a second PWB API shape.

Important consequences:

- property search returns `SearchResults` with `data` and `meta`, not `properties`
- property detail returns the property object directly, not `{ property: ... }`
- search mode should use `sale_or_rental`, not `mode`
- the plugin should not assume undocumented globals such as `globalThis.__PWB_API_URL__`

---

## Architecture

EmDash standard plugins have two entrypoints:

| File | Role |
|---|---|
| `src/index.ts` | descriptor factory, loaded by Vite from `astro.config.mjs` |
| `src/sandbox-entry.ts` | `definePlugin({ hooks, routes })` runtime logic |

Keep them separate:

- `index.ts` declares metadata, capabilities, admin pages, and entrypoint
- `sandbox-entry.ts` handles route logic, storage, and Block Kit responses

Do not put business logic in `index.ts`.

---

## Suggested Scope

Build the smallest useful version first:

1. one admin page at `/_emdash/admin/plugins/pwb-properties/`
2. one settings page at `/_emdash/admin/plugins/pwb-properties/settings`
3. list properties with pagination
4. show a read-only detail view
5. link out to the public property page or PWB admin if a stable URL exists

Do not add search facets, writeback, or sync jobs in v1.

---

## Workspace Setup

Create the package directory:

```bash
mkdir -p packages/plugins/pwb-properties/src
```

### `pnpm-workspace.yaml`

This repo already has a `pnpm-workspace.yaml`. Do not overwrite it.

Add a `packages:` section while preserving the existing `onlyBuiltDependencies` section:

```yaml
packages:
  - packages/plugins/*

onlyBuiltDependencies:
  - better-sqlite3
  - esbuild
  - sharp
  - workerd
```

### Root `package.json`

Add the plugin as a workspace dependency:

```json
{
  "dependencies": {
    "pwb-properties": "workspace:*"
  }
}
```

Then run:

```bash
pnpm install
```

When developing a local workspace plugin, restart `npx emdash dev` after changing plugin
entrypoints or runtime route code. In practice, edits under `packages/plugins/...` may not
always be picked up cleanly by the running admin/plugin host, and stale code can make a
settings save or route fix appear broken when the new handler is not actually loaded yet.

---

## Plugin Package

Create `packages/plugins/pwb-properties/package.json`:

```json
{
  "name": "pwb-properties",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./sandbox": "./src/sandbox-entry.ts"
  },
  "peerDependencies": {
    "emdash": "*"
  }
}
```

Create `packages/plugins/pwb-properties/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true
  },
  "include": ["src"]
}
```

---

## Descriptor

`packages/plugins/pwb-properties/src/index.ts`

```ts
import type { PluginDescriptor } from "emdash";

export function pwbPropertiesPlugin(): PluginDescriptor {
  return {
    id: "pwb-properties",
    version: "0.1.0",
    format: "standard",
    entrypoint: "pwb-properties/sandbox",
    options: {},
    capabilities: ["network:fetch"],
    allowedHosts: ["*"],
    adminPages: [
      { path: "/", label: "Properties", icon: "list" },
      { path: "/settings", label: "Settings", icon: "settings" }
    ]
  };
}
```

Notes:

- `allowedHosts: ["*"]` is acceptable for local development only
- in production, restrict `allowedHosts` to the actual PWB API host
- `adminPages` belongs in the descriptor, not in `definePlugin()`

If the plugin later only needs configuration, consider replacing the custom settings page
with `settingsSchema`. For now, keeping a custom settings page is reasonable because the
plugin also needs a custom list/detail admin UI.

---

## Runtime Design

`packages/plugins/pwb-properties/src/sandbox-entry.ts` should contain:

- helpers for reading and validating the configured PWB base URL
- helpers for calling the PWB API via `ctx.http.fetch()`
- one `admin` route for Block Kit interactions
- optional JSON routes only if they are useful outside the admin UI

### Store Settings Explicitly

Use plugin KV for the base URL:

- `settings:pwbApiUrl`

Do not depend on undocumented runtime globals for the main implementation.

A safe pattern is:

1. read `settings:pwbApiUrl`
2. if missing, show a settings prompt in the admin UI
3. optionally seed it once during development if EmDash exposes a documented runtime env

If you cannot prove runtime env access in plugin code, leave seeding out of v1.

### Reuse Existing PWB Contracts

Mirror the shapes already defined in `src/lib/pwb/types.ts`.

At minimum the plugin will need equivalents of:

- `SearchResults`
- `PropertySummary`
- `Property`

The easiest long-term approach is to extract shared PWB types into a workspace package
that both the site and the plugin import. If you do not want that refactor yet, copy the
types carefully from the existing PWB client layer and keep them aligned.

### Search API Assumptions

Use the same conventions as the site:

- endpoint: `/api_public/v1/en/properties`
- query param for mode: `sale_or_rental=sale|rental`
- response: `SearchResults`
- list items: `data`
- pagination metadata: `meta.page`, `meta.total_pages`, `meta.per_page`

### Detail API Assumptions

Use:

- endpoint: `/api_public/v1/en/properties/:slug`
- response body: the property object itself

---

## Block Kit Shape

Use the Block Kit shapes documented in the local plugin skill reference.

Important details:

- `fields` rows use `label` and `value`
- form elements use `action_id`
- forms use `submit: { label, action_id }`

Do not mix in alternate names like `title`, `name`, or `submit_label` unless you have
verified that the renderer accepts them.

### List View

Recommended blocks:

- `header`
- `actions` for filters
- `section` rows with a `View` button
- `actions` for pagination
- `banner` for configuration or fetch errors

### Detail View

Recommended blocks:

- `header` with property title
- `fields` for price, bedrooms, bathrooms, type, location
- `section` for description
- `actions` for back and external link buttons

### Settings View

Recommended blocks:

- `header`
- `context` or `section` explaining the URL
- `form` with one `text_input`

Example settings form shape:

```ts
{
  type: "form",
  block_id: "settings",
  fields: [
    {
      type: "text_input",
      action_id: "pwbApiUrl",
      label: "PWB API URL",
      initial_value: currentUrl,
      placeholder: "https://example.com"
    }
  ],
  submit: { label: "Save", action_id: "save_settings" }
}
```

---

## Admin Route Behavior

Keep the `admin` route simple and state-light.

Recommended interaction flow:

1. `page_load` on `/`
2. fetch page 1 of properties
3. render list blocks
4. on `view_property:<slug>`, fetch detail and render detail blocks
5. on `page:<n>`, fetch that page and render list blocks
6. on `filter:<mode>`, fetch filtered page 1 and render list blocks
7. on `/settings`, render the settings form
8. on `save_settings`, validate and persist the URL, then re-render with a success toast

If the URL is not configured:

- the properties page should render a warning banner
- the settings page should remain available

If the API call fails:

- log the failure with `ctx.log`
- render a user-facing error banner
- avoid pretending that “no results” and “request failed” are the same thing

---

## URL Validation

Validate the configured base URL before persisting it.

Recommended checks:

- must parse via `new URL()`
- must use `http:` or `https:`
- strip a trailing slash before storing

If validation fails, return a Block Kit response with an error banner or toast rather than
silently saving bad data.

---

## Registration in `astro.config.mjs`

Add the import:

```js
import { pwbPropertiesPlugin } from "pwb-properties";
```

Register the plugin in exactly one array per environment.

For this repo's current pattern, that means:

```js
plugins: isDev
  ? [formsPlugin(), webhookNotifierPlugin(), pwbPropertiesPlugin()]
  : [formsPlugin()],

sandboxed: isDev
  ? []
  : [webhookNotifierPlugin(), pwbPropertiesPlugin()],
```

Do not put `pwbPropertiesPlugin()` in both `plugins` and `sandboxed` for the same
environment.

### Vite Exclude

Add `"pwb-properties"` to `vite.optimizeDeps.exclude` alongside the other local/plugin
packages:

```js
exclude: [
  "@emdash-cms/admin",
  "emdash",
  "emdash/astro",
  "@emdash-cms/plugin-forms",
  "@emdash-cms/plugin-webhook-notifier",
  "pwb-properties",
  ...emdashLocalExcludes,
  ...nativeSsrExcludes
]
```

---

## Suggested Implementation Order

1. scaffold package, descriptor, and runtime entrypoint
2. add plugin registration to `astro.config.mjs`
3. implement settings storage and validation
4. implement list fetch against the real PWB search response
5. implement detail fetch against the real PWB detail response
6. add pagination and sale/rental filter buttons
7. improve error states and empty states

---

## Acceptance Criteria

The guide should be considered implemented only when all of the following are true:

| Check | Expected |
|---|---|
| Plugin appears in admin sidebar | Yes |
| Settings page can save a valid URL | Yes |
| Invalid URL is rejected with a clear message | Yes |
| List page loads properties from PWB | Yes |
| Sale/rental filter uses `sale_or_rental` and works | Yes |
| Pagination uses API metadata, not `items.length === 20` heuristics | Yes |
| Detail view loads a property by slug | Yes |
| API failures show an error state distinct from empty results | Yes |
| After changing plugin runtime code locally, the dev server is restarted before retesting | Yes |
| Production config registers plugin only in `sandboxed` | Yes |

---

## Common Mistakes To Avoid

1. Defining the same plugin in both `plugins` and `sandboxed` for production.
2. Rebuilding PWB response types incorrectly instead of following the existing client.
3. Using `mode` instead of `sale_or_rental` in PWB search requests.
4. Assuming property detail returns `{ property }` when the site expects the object directly.
5. Treating API failure as an empty list.
6. Overwriting `pnpm-workspace.yaml` instead of merging the workspace config.
7. Using undocumented env access in plugin runtime code without verifying it.
8. Using Block Kit field names that differ from the documented local reference.
9. Retesting a plugin fix without restarting `npx emdash dev`, causing stale plugin code to remain active.

---

## Recommendation

This plugin makes sense. The strongest version is a thin admin-facing adapter around the
existing PWB API contracts already used by the site.

If you build it that way, you avoid two classes of problems:

- the plugin drifting from the public site's real PWB integration
- the guide drifting from EmDash's actual standard-plugin model

If you later need richer admin UX, you can revisit whether this should remain a standard
Block Kit plugin or become a native/trusted plugin with React admin pages. For the current
scope, standard + Block Kit is the right default.
