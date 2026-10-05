# Lead & CTA Reporting

The **Leads & CTAs** admin page (plugin `lead-reports`, under Plugins in the
EmDash admin) shows which pathways are creating leads:

- **Stats** — enquiries, CTA clicks, and enquiries per CTA click for the last 7, 30 or 90 days
- **Daily chart** — enquiries and CTA clicks per day
- **By call to action** — clicks and enquiries per CTA id. A property page's main
  CTA uses the same id as the enquiry form's CTA source (e.g. `book_viewing`), so
  clicks and the enquiries they led to share a row
- **By page type** and **Top pages**

## What is recorded

| Event | When | Fields |
|---|---|---|
| `cta_click` | A click on any element with `data-cta="<id>"` | CTA id, page path, page type |
| `enquiry` | A successful contact-form submission | CTA source, page type, listing slug, page path |

No personal data is stored: no names, emails, messages, IPs, or query strings.
Page type is the form's own attribution for enquiries, and otherwise derived from
the URL (`pageTypeFromPath`).

Events are sent from the browser (`src/lib/lead-tracking.ts`, loaded by
`BaseLayout`) with `fetch(..., { keepalive: true })` to the plugin's public `track`
route. Consequences worth knowing:

- Visitors with JavaScript disabled or tracking blocked aren't counted.
- The route is public, so the numbers are an operational signal, not an audit log.
  Enquiries themselves still go to PWB with their attribution note (Milestone 3.3).
- Valuation requests (`pwb-valuation`) are stored by that plugin and listed on its
  own admin page; they aren't included here.

## Tagged CTAs

| `data-cta` | Where |
|---|---|
| `header_contact` | Header "Contact Us" button |
| `hero_browse`, `hero_contact` | Homepage hero buttons |
| `<property CTA type>`, `<type>_secondary` | Property page CTA (and its mobile sticky bar) |
| `area_cta` | Area / lifestyle page CTA |
| `pwb_cta`, `local_expertise`, `valuation_cta` | Page-part blocks |

To track another CTA, add `data-cta="<id>"` (letters, digits, `_ . : -`) to the link
or button. Nothing else is needed.

## Implementation

- Plugin: `src/plugins/lead-reports.ts` (storage `events`, indexed by `kind` and
  `createdAt`) and `src/plugins/lead-reports.sandbox.ts` (`track` and `admin` routes)
- Validation, aggregation, Block Kit report: `src/lib/lead-reports.ts`
- Browser tracker: `src/lib/lead-tracking.ts`
- Tests: `src/lib/lead-reports.test.ts`, `src/lib/lead-tracking.test.ts`,
  `e2e/lead-reports.spec.ts` (mocked backend, `pnpm test:visual`)

Plugin route errors use `PluginRouteError` from `emdash`; EmDash reports a thrown
`Response` as a 500, whatever its status.
