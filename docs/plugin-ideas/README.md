# PWB × EmDash Plugin Ideas

Six integration opportunities identified from the EmDash plugin docs, grounded in
the existing `pwb-properties`, `pwb-property-embeds`, and `pwb-valuation` plugins.

## Ideas at a Glance

| # | Idea | Plugin | Hook / API | Effort | Value |
|---|------|--------|-----------|--------|-------|
| 1 | [Property JSON-LD structured data](./pwb-json-ld.md) | `pwb-properties` | `page:metadata` | Medium | SEO — Google indexes price, beds, location |
| 2 | [Property backlink tracker](./pwb-backlink-tracker.md) | `pwb-properties` | `content:afterSave` + storage | Medium | Visibility into which content references which property |
| 3 | [Embed validation on save](./pwb-embed-validation.md) | `pwb-properties` | `content:beforeSave` | Low | Blocks broken embed slugs before they reach production |
| 4 | [Property enquiry plugin](./pwb-enquiry.md) | new `pwb-enquiry` | public API route + storage | Medium | Lead capture per property listing |
| 5 | [Dashboard stats widget](./pwb-dashboard-widget.md) | `pwb-properties` | `adminWidgets` | Low | At-a-glance total/sale/rental counts on admin dashboard |
| 6 | [Settings schema refactor](./pwb-settings-schema.md) | `pwb-properties` | `admin.settingsSchema` | Low | Removes ~70 lines of hand-built settings form |

---

## Recommended Build Order

### Phase 1 — Quick wins (Low effort, no new plugins)

**#6 Settings schema refactor** → simplifies the plugin before adding more to it.

**#5 Dashboard widget** → one new route handler in `pwb-properties`, visible immediately.

**#3 Embed validation** → one new hook, uses existing `getProperty()` helper, prevents
a whole class of editor errors.

### Phase 2 — Data and SEO (Medium effort, existing plugins)

**#1 JSON-LD** → one new hook in `pwb-properties`, direct SEO benefit, no frontend changes.

**#2 Backlink tracker** → new storage collection + hook + admin page in `pwb-properties`.

### Phase 3 — New plugin (Medium effort, new package)

**#4 Property enquiry** → new `pwb-enquiry` package, mirrors `pwb-valuation` exactly.
Most of the code is copy-paste with property context added.

---

## EmDash Plugin Capabilities Used

These ideas collectively exercise every major plugin capability from the docs:

| Capability | Used by |
|---|---|
| `content:beforeSave` hook | #3 embed validation |
| `content:afterSave` hook | #2 backlink tracker |
| `page:metadata` hook | #1 JSON-LD |
| `adminWidgets` | #5 dashboard widget |
| `admin.settingsSchema` | #6 settings refactor |
| Plugin storage with indexes | #2 backlink tracker, #4 enquiry |
| Public API routes | #4 enquiry |
| `network:fetch` capability | #1, #3, #5 (existing) |
| Astro route injection | #4 enquiry |

The one capability from the docs not yet planned is `page:fragments` (raw HTML/script
injection into the public site). This is trusted-plugin-only and would be useful for
injecting a floating enquiry widget or chat button without modifying Astro templates.
