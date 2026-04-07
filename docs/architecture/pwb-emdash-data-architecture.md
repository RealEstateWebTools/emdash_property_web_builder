# PWB × EmDash Data Architecture: Live Fetch vs. Mirror

This document analyses the architectural decision to source property listings from the
PWB Rails backend at render time rather than storing them in EmDash, and explains in
detail why the alternative (mirroring) solves certain problems while introducing a
significantly more complex sync architecture.

---

## Current Architecture: Live Fetch

```
Browser request
    │
    ▼
Cloudflare Worker (EmDash / Astro SSR)
    │
    ├─ Reads editorial content from EmDash (D1 database)
    │   posts, pages, menus, taxonomies
    │
    └─ For each propertyEmbed block in the content:
        │
        └─ Fetches property data from PWB Rails backend
            GET /api_public/v1/en/properties/:slug
```

**Key files:**

| File | Role |
|------|------|
| `packages/plugins/pwb-property-embeds/src/astro/pwb.js` | `getPropertyBySlug()` — live fetch at render time |
| `packages/plugins/pwb-property-embeds/src/astro/PropertyEmbed.astro` | Renders the result or an error card |
| `packages/plugins/pwb-properties/src/sandbox-entry.js` | Admin browsing of the same PWB API |

Properties are never stored in EmDash. The D1 database contains only editorial content.

---

## Advantages of Live Fetch

### 1. Single source of truth

Property data — price, availability, photos, status, bedrooms, bathrooms — lives
exclusively in PWB. When a property is marked sold, the price drops, or the agent
updates the photos, every EmDash page that embeds it reflects the change on the next
request. No editorial action is required. No cache to invalidate. No copy to update.

This is the most important advantage. Property listings are operationally live data.
They change for reasons outside editorial control (sales, rentals, price negotiations,
agent updates). A system that requires an editor to manually sync those changes will
drift — and drifted price or availability data on a property site is a serious problem
for both users and the business.

### 2. No sync problem by design

Duplication creates two sources of truth. Two sources of truth creates divergence.
Divergence requires reconciliation. The live-fetch approach eliminates this entirely
— there is only one copy of the data, in PWB.

### 3. Separation of concerns

Content editors work in EmDash (blog posts, pages, articles). Property managers work
in PWB (listings, pricing, availability, photos). Neither system needs to model the
other's domain. EmDash doesn't need property-specific fields, status workflows, or
availability logic. PWB doesn't need to know about blog posts or taxonomies.

This boundary also means the two systems can be developed, deployed, and scaled
independently.

### 4. Rails query capability stays intact

PWB's property search — filtering by type, price range, bedrooms, sale/rental mode,
location — uses ActiveRecord and a full relational database. These queries are
expressive and fast. Replicating that query capability in EmDash (which uses SQLite/D1)
would require reimplementing significant backend logic.

---

## Disadvantages of Live Fetch

### 1. Runtime coupling

The EmDash Cloudflare Worker depends on the PWB Rails backend being reachable at
request time. If PWB is down, overloaded, or timing out, every page with a
`propertyEmbed` block degrades. `PropertyEmbed.astro` handles this gracefully
(shows "Property unavailable"), but the degradation is visible to end users.

This is not a theoretical risk. PWB may be deployed on a different infrastructure with
its own maintenance windows, deployment downtime, or rate limits. The EmDash site
inherits all of that.

### 2. No CMS-level search across properties

EmDash's full-text search indexes its own content collections. Properties are
invisible to it. A visitor searching "3 bedroom Marbella" will find blog posts that
mention those words, but not property listings that match those criteria.

To search properties, users must use a separate property search UI backed directly by
PWB. The two search experiences are disconnected.

### 3. Outbound fetch latency at render time

Each `propertyEmbed` block on a page costs one outbound HTTP request from the
Cloudflare Worker to PWB at render time. Multiple embeds on one page mean multiple
sequential or parallel fetches, each adding latency before the page can be served.

Cloudflare Workers run at the edge, but if PWB is hosted in a single region (e.g. a
VPS in Frankfurt), every Worker PoP outside that region pays a cross-region round trip
per embed. A page with three property embeds and a Worker running in Singapore pays
three transatlantic fetches before it can render.

### 4. Slug coupling

Property slugs are the join key between EmDash content and PWB data. If a slug changes
in PWB — because the property was re-entered, renamed, or the PWB slug generation
logic changed — every `propertyEmbed` block that references the old slug silently
breaks. The page renders a "Property unavailable" card.

There is no foreign-key constraint, no referential integrity, and no automated
detection. The embed validation plugin idea (docs/plugin-ideas/pwb-embed-validation.md)
catches this at save time, but not retrospectively.

### 5. No build-time rendering

Because property data is not available except via a live network request to PWB, pages
containing property embeds cannot be pre-rendered at build time. This is not currently
a problem (the site is fully `output: "server"`), but it permanently forecloses the
option of static generation for performance-critical pages.

### 6. Admin is read-only

Editors can browse and view properties in the EmDash admin (via `pwb-properties`), but
cannot create, edit, or delete them. Property management requires leaving EmDash and
working directly in PWB. This context-switching adds friction to workflows that cross
both systems.

---

## The Alternative: Mirroring Properties into EmDash

Mirroring means periodically (or event-driven) copying property data from PWB into an
EmDash content collection so that properties become first-class CMS content.

At a high level:

```
PWB Rails backend
    │
    │  (webhook on change, or scheduled poll)
    ▼
Sync process
    │
    ▼
EmDash D1 database
  └─ properties collection
      ├─ slug (indexed)
      ├─ title
      ├─ price
      ├─ status
      ├─ bedrooms, bathrooms
      ├─ location fields
      └─ photos (mirrored to R2 or referenced by URL)
```

### How It Solves the Live-Fetch Problems

**Resilience**: EmDash serves property data from its own D1 database. If PWB goes
down, property pages continue to render correctly from the mirror. The site is
decoupled from PWB's availability.

**Full-text search**: Properties in EmDash's content collection are indexed by
EmDash's search. A single search box can find both editorial content and matching
property listings. Filtering, faceting, and ranking can be implemented within EmDash.

**No render-time latency**: Property data is read from D1 (co-located with the Worker
on Cloudflare's edge), not fetched over the network. Page render times are fully
predictable regardless of PWB's location or load.

**Slug stability**: EmDash holds the slugs. If a PWB slug changes, the sync process
can detect the change and update the mirror — or the slug in EmDash can be kept stable
independently and mapped to PWB's internal ID rather than slug.

**Build-time rendering**: With property data in D1, pages could be statically generated
at build time if desired, enabling edge-cached HTML for property listings.

**Rich admin**: Editors can view (and optionally edit) properties directly in EmDash
without context-switching to PWB.

---

## Why Mirroring Is Significantly More Complex

Mirroring sounds straightforward — copy data from A to B. In practice it requires
solving a set of hard distributed systems problems.

### Problem 1: Change detection

To keep the mirror current, the sync process must know when something changed in PWB.
There are two approaches, both with significant drawbacks:

**Polling**: Periodically fetch all properties (or a "changed since" page) and
compare against the mirror.

- PWB must expose a "modified since" API endpoint (filtered by `updated_at`). If it
  doesn't, you must fetch all properties every time — expensive at scale.
- Clock skew between PWB and the sync process can cause missed updates. A property
  updated 2 seconds before the poll runs may be missed if the comparison uses `>=`
  rather than `>` with appropriate overlap.
- The poll interval is a latency floor. A property that goes under offer at 9:00am
  may still show as available on EmDash until the 9:05am poll.
- Polling at high frequency to minimise latency increases load on PWB. Polling at low
  frequency means stale data for longer.

**Webhooks**: PWB fires an event to the sync endpoint on every create, update, or
delete.

- PWB must implement a webhook system. This is non-trivial Rails work if it doesn't
  already exist.
- The sync endpoint must be reliable. If it is down when PWB fires a webhook, the
  event is lost. This requires a retry queue (e.g. Cloudflare Queues, or a durable
  webhook delivery system).
- Webhooks can arrive out of order. A "price updated" event can arrive before the
  "property created" event if there is any network reordering. The sync process must
  handle idempotency and ordering.
- Webhooks can be duplicated. The sync process must be idempotent.

### Problem 2: Initial and full sync

When the mirror is first set up, or after any period of downtime, the entire property
catalogue must be bulk-copied into EmDash. For a large portfolio this can be thousands
of records. This requires:

- A paginated bulk import that can be paused and resumed without duplicating records.
- Rate limiting to avoid overloading the PWB API.
- A way to handle changes that occur during the bulk import (a property updated while
  the sync is running).
- A completion signal so the site knows when the mirror is consistent enough to serve.

The bulk sync and the incremental sync must coexist without interfering.

### Problem 3: Deletions

Detecting that something was deleted is harder than detecting an update. With polling,
you must compare the full set of IDs in PWB against the full set in EmDash and delete
the difference. With webhooks, PWB must fire a `property.deleted` event, and the sync
process must handle it.

If a deletion event is lost (webhook delivery failure, sync process downtime), the
mirror retains a stale record indefinitely. Users see a listing that no longer exists.

Soft-delete patterns in PWB (marking records inactive rather than deleting them) help
here, but require the mirror to understand and propagate the `status` field correctly.

### Problem 4: Schema evolution

When PWB adds, renames, or removes a field from the property API response, the sync
process and the EmDash collection schema must both be updated in lockstep. If the sync
process runs with the old field mapping while EmDash expects the new schema, records
may be written with missing or incorrect fields.

This requires a versioned migration strategy for the mirror, similar to database
migrations in Rails, but across two systems with separate deployment cycles.

### Problem 5: Media (photos)

Property photos are large binary assets. The live-fetch approach references photo URLs
from PWB directly. Mirroring properly means also mirroring the photos to R2 to achieve
full resilience independence.

Photo mirroring adds:
- Download from PWB photo URLs, upload to R2.
- Deduplication (don't re-upload unchanged photos).
- Cleanup when photos are removed from a property in PWB.
- Handling of photo order changes.

If photos are not mirrored (only URLs are stored), the "resilience" benefit of
mirroring is partial — photo loads still depend on PWB's or its CDN's availability.

### Problem 6: Conflict resolution

If EmDash allows editors to override property fields (e.g. a custom marketing title
that differs from PWB's title), the sync process must decide whose version wins on the
next sync cycle. Options:

- PWB always wins → editor overrides are silently reverted.
- EmDash wins → the mirror never updates fields that editors have touched.
- Per-field precedence rules → complex to implement and audit.

This problem does not exist in the live-fetch approach because EmDash never stores
property data.

### Problem 7: Operational burden

The sync process is a new piece of infrastructure that must be:
- Deployed, monitored, and maintained.
- Alerted on failure (a silent sync failure means the mirror drifts without anyone
  noticing).
- Tested — both the happy path and failure modes (PWB down, network partition, bad
  data from PWB).
- Scaled if the property catalogue grows significantly.

In the live-fetch approach, none of this infrastructure exists. Each render either
succeeds or fails visibly.

---

## Summary: When to Re-Evaluate

The current live-fetch approach is correct for the current scale and requirements. The
trade-off would be worth revisiting if:

- **PWB availability becomes a significant source of EmDash downtime** — measure this
  before assuming it is a problem.
- **Property search from the EmDash site becomes a product requirement** — the backlink
  tracker and embed validation ideas buy time, but full search requires mirroring.
- **Render latency from outbound fetches becomes measurable** — instrument first.
- **The property catalogue becomes very large** (thousands of listings) and pages
  routinely embed many properties — batch prefetching or a read-through cache may be
  sufficient without full mirroring.

A lighter alternative to full mirroring is a **read-through cache** in plugin storage:
the first fetch for a slug stores the result in `ctx.storage` with a TTL; subsequent
renders within the TTL window read from D1 without hitting PWB. This addresses
latency and partial resilience without the full complexity of a sync architecture.

---

## Related Docs

- [docs/plugin-ideas/pwb-backlink-tracker.md](../plugin-ideas/pwb-backlink-tracker.md)
- [docs/plugin-ideas/pwb-embed-validation.md](../plugin-ideas/pwb-embed-validation.md)
- [docs/plugin-ideas/pwb-json-ld.md](../plugin-ideas/pwb-json-ld.md)
