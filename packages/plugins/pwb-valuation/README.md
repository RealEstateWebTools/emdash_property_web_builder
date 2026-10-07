# pwb-valuation

EmDash plugin — property valuation request form with admin review UI.

## What it does

- Injects a `/valuation` page (Astro component) into the site with a multi-field valuation request form.
- Stores submitted requests in EmDash plugin storage (`ctx.storage.valuations`).
- Provides an **admin review table** (name, email, address, type, bedrooms, condition, status, submission time) under **Admin → Plugins → pwb-valuation**.
- Exposes a JSON list endpoint at `/_emdash/api/plugins/pwb-valuation/list` for external integrations.

## Form fields

| Field | Type | Required |
|-------|------|----------|
| Name | text | yes |
| Email | email | yes |
| Phone | tel | no |
| Address | text | yes |
| Property type | select (house / apartment / villa / townhouse / commercial / land / other) | no |
| Bedrooms | select (studio / 1 / 2 / 3 / 4 / 5 / 6+) | no |
| Condition | select (excellent / good / needs work / unknown) | no |
| Notes | textarea | no |

## API routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/_emdash/api/plugins/pwb-valuation/submit` | public | Submit a valuation request |
| GET | `/_emdash/api/plugins/pwb-valuation/list` | admin | Paginated JSON list of requests |
| POST | `/_emdash/api/plugins/pwb-valuation/admin` | admin | Block Kit admin UI handler |

## PortableText block

The separate **`pwb-page-parts`** plugin registers the **`pwb-valuation-cta`** block type for use in page content. The block renders a styled valuation CTA with configurable heading, body copy, and button label, linking to the `/valuation` page.

## Registration

```js
// astro.config.ts
import { pwbValuationPlugin } from 'pwb-valuation'
import { pwbValuationIntegration } from 'pwb-valuation/integration'

// Astro integration — injects the /valuation page
pwbValuationIntegration({
  layout: './src/layouts/BaseLayout.astro',
  pwbClientModule: './src/lib/pwb/client.js',
})

// EmDash plugin — registers routes and admin UI
emdash({
  plugins: [pwbValuationPlugin(), ...],
})
```

The backend descriptor uses `standard` format and runs in this site's trusted
`emdash({ plugins: [...] })` array. `bundledPlugins` is only a local variable.
Supports EmDash `^1.1.0`. A future registry release must separate the sandboxed
backend from the native Astro integration: registry installation cannot inject
the `/valuation` page. The integration requires a host layout accepting `site`
and `title`, and a module exporting `createPwbClient()` whose client supplies
`getSiteDetails()`. No standalone release has been verified.

Known release gaps: input validation currently checks only nonempty name/email/
address, submissions lack plugin-level spam controls, the admin table stops at
50 records, and the JSON list stops at 100 with no cursor. Status updates and
deletion/retention workflows remain unimplemented. Submission logs include email.
See the [readiness report](../../../docs/plugin-release-readiness.md).

## Seed example

The `/valuation` page is automatically injected and requires no seed entry. To link to it from a page, use the valuation CTA block in `pwb-page-parts`:

```json
{
  "type": "pwb-valuation-cta",
  "eyebrow": "Free valuation",
  "heading": "What is your property worth?",
  "body": "Get an expert estimate in 24 hours.",
  "buttonLabel": "Request valuation"
}
```
