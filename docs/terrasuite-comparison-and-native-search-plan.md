# TerraSuite comparison and native listing search plan

Recorded: 2026-10-10. Status: source review and proposed work; implementation has
not started as part of this review.

This project has broader agency functionality. TerraSuite has a smaller template
and a stronger database-backed native search implementation. The recommended next
change is to fix native listing completeness while retaining our existing pages,
plugins and optional PWB integration.

## Sources and scope

External references:

- [EmDash discussion #3593](https://github.com/emdash-cms/emdash/discussions/3593),
  published 2026-09-28: design rationale, reported benchmarks and integration lessons.
- [TerraSuite repository and README](https://github.com/havenswift-hosting/terrasuite-emdash):
  template scope, setup and exclusions.
- [TerraSuite search source](https://github.com/havenswift-hosting/terrasuite-emdash/blob/main/src/lib/property-search.ts):
  SQL filters, pagination, facets, image resolution and English locale selection.
- [TerraSuite package manifest](https://github.com/havenswift-hosting/terrasuite-emdash/blob/main/package.json):
  Node runtime, dependency ranges and available verification scripts.

Local findings come from the files linked below. This is a source comparison:
neither application was run for comparative visual or performance testing, and
the presence of tests does not establish that they currently pass.

## Comparison

| Concern | This project | TerraSuite |
| --- | --- | --- |
| Listing source | Native EmDash properties or PWB Rails API, selected through `ListingSource` | Native EmDash collection tables |
| Native search | In-memory filtering, sorting and pagination over a capped collection load | Parameterised SQL with search indexes |
| Search filters | Sale/rental, price range, minimum bedrooms/bathrooms, property type; source also supports featured listings | Additional multiple towns/types, minimum built area, pool, new build, availability and feature membership |
| Map presentation | Leaflet grid/map view with listing markers | Published template excludes a map UI |
| Location content | CMS-managed area/lifestyle pages with curated listings, highlights, FAQs, testimonials and CTAs | Town inventory pages |
| Languages | English, Spanish and French routes and fallback | Reviewed search explicitly selects English |
| Agency workflows | Enquiries, lead reporting, valuation requests and configurable property CTAs | Published scope centres on listings and search |
| Customisation | Theme settings and reusable editorial/property blocks | Small template with one stylesheet and colour variables |
| Production runtime | Cloudflare Workers, D1 and R2; local SQLite and uploads | Node and SQLite |
| Verification | Vitest, Playwright and visual regression suites in this repo | Typechecking script; no test suite declared in reviewed manifest |
| Declared versions | EmDash `^1.1.0`, Astro `^7.3.5` | EmDash `^1.0.1`, Astro `^7.3.2` |

TerraSuite's narrower scope makes its implementation easier to understand and
distribute. Our additional workflows create more capability and maintenance:
custom plugins, backend adapters, React shims and a local EmDash patch. Neither
scope alone proves greater production reliability.

### Local evidence

- [ListingSource and backend selection](../src/lib/listings/source.ts):
  `PWB_API_URL` selects PWB; otherwise native EmDash listings are used.
- [Native listing source](../src/lib/listings/native-source.ts): conversion,
  filtering, facets, detail lookup and `MAX_LISTINGS = 1000`.
- [URL search parameters](../src/lib/pwb/search-params.ts): current public filters.
- [Property index page](../src/components/pages/PropertyIndexPage.astro) and
  [map component](../src/components/MapView.astro): listing and map presentation.
- [Area helpers](../src/lib/areas.ts): editorial area/lifestyle page structure.
- [Enquiry storage](../src/lib/enquiries/emdash-store.ts),
  [lead runtime](../src/plugins/lead-reports.sandbox.ts),
  [valuation runtime](../packages/plugins/pwb-valuation/src/sandbox-entry.js) and
  [property CTAs](../src/lib/property-cta.ts): agency workflows. Email delivery
  depends on provider and office configuration.
- [Theme settings](../src/plugins/pwb-theme.ts),
  [Astro configuration](../astro.config.ts) and [package manifest](../package.json):
  themes, locales, runtime, plugins and verification commands.

## Native listing completeness gap

`loadProperties()` requests at most 1,000 collection entries and does not follow
the returned pagination cursor. `searchProperties()`, facets, search configuration
and `getProperty()` all use that loaded set. Actual API limits may further restrict
what is returned; the requested limit is not proof that 1,000 rows are fetched.

Once published inventory exceeds the loaded set:

- results, totals, facets and map markers can omit valid listings;
- a direct property URL can return 404 because `getProperty()` searches that same
  set rather than querying the slug independently;
- sorting and pagination operate only over the subset.

The native locale fallback currently loads default-locale inventory only when the
requested locale returns no entries. That behaviour must be considered explicitly
when changing detail lookup; per-property fallback would be a behaviour change.

This limitation applies to native mode. PWB mode delegates listing operations to
its API; this review did not benchmark or audit the Rails backend.

## What to learn from TerraSuite

TerraSuite implements ranges and feature membership through trusted site SQL
rather than loading inventory into memory. Its author explains that the content
API and sandbox storage query surface did not express the required search. Treat
that as rationale for the reviewed version, and inspect our installed EmDash API
before choosing the implementation path.

The author reports roughly 4.0 ms without search indexes versus 0.09 ms with a
covering index at 20,000 properties, and 0.226 ms at 50,000 properties. These are
author-reported query benchmarks, not page-load timings, D1 measurements or a
comparison against this project. See the [discussion](https://github.com/emdash-cms/emdash/discussions/3593).

Borrow the database search approach rather than copying the Node SQLite handle or
index definition: our production runtime uses D1 and our listing fields differ.
Direct collection-table access also introduces coupling to EmDash's schema.

Two integration lessons from the discussion are worth retaining: image fields
contain a media object rather than a bare media ID, and reverse-proxy installations
need the correct public origin for image URLs. The cited `EMDASH_SITE_URL` setting
concerns their Node deployment; verify applicability before changing our Worker
configuration. See the [discussion](https://github.com/emdash-cms/emdash/discussions/3593).

## Recommended next work

### 1. Fetch property details independently by slug

Inspect the installed EmDash entry-query API, then replace native detail lookup
over `all()` with a direct published-entry lookup. Preserve the `Property` shape,
image/Portable Text conversion, missing-entry errors and an explicit locale policy.

Acceptance: a published listing outside the former collection subset resolves;
missing, draft and deleted listings remain unavailable to public callers; translated
and fallback cases have deliberate, tested behaviour.

### 2. Query native search in SQLite and D1

Keep `ListingSource` as the page-facing interface. Inspect the installed database
access API, actual collection schema and migrations before writing queries. Move
filters, stable sorting, counts and pagination to the database. Choose indexes from
our query shapes, including publication/deletion and locale constraints.

Bind request values and allowlist sort expressions. Preserve current sale/rental
defaults, missing-price ordering, property type normalisation and response shapes.
Define facet scope explicitly, and preserve or deliberately revise the current map
behaviour (markers cover all matches rather than just the current page).

Propagate EmDash cache hints to `Astro.cache.set()` on content-querying pages and
verify invalidation after edits. Database access must not bypass public visibility
rules or expose unpublished listings.

Acceptance: search, totals and facets cover all eligible inventory, SQLite and D1
produce equivalent results, pagination is deterministic, and PWB mode still uses
its existing API adapter.

### 3. Verify completeness and performance

Use isolated test inventory exceeding 1,000 listings. Cover price boundaries,
sale/rental modes, missing prices, tied sorts, facets, map markers, locale fallback,
publication state and direct detail URLs beyond the old subset.

Benchmark realistic inventories such as 1,000, 5,000 and 20,000 listings. Record
query and page timings separately, along with runtime, indexes and data shape.
Do not adopt TerraSuite's timings as our targets without comparable measurements.

Existing commands, to be selected according to the implementation:

```bash
pnpm run test:run src/lib/listings/native-source.test.ts src/lib/listings/source.test.ts
pnpm run test:native
pnpm run typecheck
pnpm run build
```

Steps 1–3 form the next focused implementation change. They are proposed work,
not completed features or measured improvements.

### 4. Add richer filters after correctness

Start with town/city and region, then amenities supported by the listing schema.
Define URL parameters, facet semantics and listing-collection editor controls
together. Existing location pages use curated listings; they are not automatic
geographical searches. See [Listing Collections](listing-collections.md).

Check backend capabilities before offering the same filter in PWB mode. Changes
needed in the parent Rails repository require separate authorisation under this
repo's safety rules.

## Direction

Retain the broader agency platform and its optional PWB backend. Prioritise native
listing completeness and database search before expanding filter count. This plan
supplements the older [product roadmap](product-roadmap.md); it does not imply that
the other roadmap initiatives have been completed.
