# pwb-valuation Plugin

A property valuation request feature delivered as an EmDash plugin + Astro integration pair.
It demonstrates the **route injection** pattern described in [emdash-lms-patterns.md](./emdash-lms-patterns.md).

## What it provides

| Piece | What it does |
|---|---|
| `/valuation` page | Server-rendered form injected by the Astro integration — no file in `src/pages/` needed |
| `/_emdash/api/plugins/pwb-valuation/submit` | Public API route that stores form submissions |
| `/_emdash/api/plugins/pwb-valuation/list` | Admin-only JSON list of all submissions |
| Admin UI | Block Kit page under EmDash admin showing all valuation requests |

## Registration

Both pieces must be registered in `astro.config.mjs`:

```js
import { pwbValuationPlugin }      from 'pwb-valuation'
import { pwbValuationIntegration } from 'pwb-valuation/integration'

export default defineConfig({
  integrations: [
    pwbValuationIntegration({
      layout:          './src/layouts/BaseLayout.astro',
      pwbClientModule: './src/lib/pwb/client.js',
    }),
    emdash({
      plugins: [..., pwbValuationPlugin()],
    }),
  ],
})
```

**`pwbValuationIntegration`** is an Astro integration — it injects the `/valuation` page route
and sets up the virtual modules that let the injected page import from the host site.

**`pwbValuationPlugin`** is an EmDash plugin — it registers the API routes and admin UI.

Both are needed. The integration alone gives you a page with no backend. The plugin alone
gives you an API with no frontend.

## Integration options

| Option | Default | Description |
|---|---|---|
| `layout` | `./src/layouts/BaseLayout.astro` | Path to the host's layout component (relative to project root) |
| `pwbClientModule` | `./src/lib/pwb/client.js` | Path to the PWB client module (relative to project root) |
| `basePath` | `''` | URL prefix — set to `'/en'` for locale-prefixed routes |

## How the injected page works

The page (`src/pages/valuation.astro` inside the plugin package) cannot use relative imports
to the host site. Virtual modules bridge the gap — the Vite plugin in `integration.js` resolves
these at build time:

| Import | Resolves to |
|---|---|
| `virtual:pwb-valuation/layout` | Host's `BaseLayout.astro` |
| `virtual:pwb-valuation/pwb-client` | Host's `client.js` (re-exports `createPwbClient`) |
| `virtual:pwb-valuation/config` | `{ basePath }` serialised from integration options |

The page handles both GET (render form) and POST (forward JSON to the plugin's `submit` API
route, then redirect to `?sent=1`).

## Submit API route

`POST /_emdash/api/plugins/pwb-valuation/submit`

Public — no authentication required. EmDash pre-parses the request body into `routeCtx.input`;
**do not call `routeCtx.request.json()`** as the stream is already consumed.

### Request body (JSON)

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Requester's full name |
| `email` | Yes | Requester's email address |
| `address` | Yes | Property address to value |
| `phone` | No | Contact phone number |
| `notes` | No | Free-text notes |

All fields are trimmed before validation. Whitespace-only strings are treated as empty.

### Responses

| Status | Body | Meaning |
|---|---|---|
| 200 | `{ success: true, id: "..." }` | Stored successfully |
| 422 | `{ error: "..." }` | Missing required field |

## Storage

Submissions are stored in the plugin's `valuations` collection, indexed by `email`, `status`,
and `createdAt`. Stored records have the shape:

```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+1 555 000 0000",
  "address": "123 Main St, Marbella",
  "notes": "Three bed preferred",
  "status": "new",
  "createdAt": "2024-06-01T12:00:00.000Z"
}
```

`status` is always `"new"` on creation. Future work could add a status-update route for the
admin to mark requests as reviewed or completed.

## Tests

Route handlers and UI-block helpers are tested in
`packages/plugins/pwb-valuation/src/sandbox-entry.test.js` (19 tests).

Run them with:

```bash
npx vitest run packages/plugins/pwb-valuation/src/sandbox-entry.test.js
```

Coverage includes:
- `buildValuationRows` — field mapping and missing-field fallbacks
- `buildListBlocks` — empty state, table rendering, stats counts
- `submit` route — happy path, whitespace trimming, all required-field 422 cases, non-string input
- `list` route — id spreading, empty result
- `admin` route — block structure, storage query parameters

## Package layout

```
packages/plugins/pwb-valuation/
├── package.json              exports: . / /sandbox / /integration / /pages/valuation
├── src/
│   ├── index.js              EmDash plugin descriptor factory
│   ├── integration.js        Astro integration (injectRoute + virtual modules)
│   ├── sandbox-entry.js      EmDash plugin runtime (routes + Block Kit admin)
│   ├── sandbox-entry.test.js Tests
│   └── pages/
│       └── valuation.astro   Injected frontend page
```
