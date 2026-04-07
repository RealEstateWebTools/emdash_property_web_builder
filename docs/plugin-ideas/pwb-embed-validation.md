# Plugin Idea: Property Embed Validation on Save

**Target plugin:** `pwb-properties` (already trusted, has `network:fetch:any`)
**Hook used:** `content:beforeSave`
**Effort:** Low — one hook, uses existing `getProperty` helper

---

## Problem

An editor can type any string into the Property Slug field of a `propertyEmbed` block
and save. If the slug doesn't exist in PWB — due to a typo, a deleted listing, or a
slug rename — the published page silently shows a "Property unavailable" error card.

There is no validation at save time. The broken embed ships to production undetected.

---

## Approach

Use `content:beforeSave` to scan the incoming Portable Text body for `propertyEmbed`
blocks, verify each slug against the PWB API, and return a validation error to cancel
the save if any slug is missing. The editor sees an inline error before the content
is persisted.

`pwb-properties` is already trusted with `network:fetch:any`. No new capabilities or
plugin registrations are needed.

---

## Implementation

### Add the hook to `sandbox-entry.js`

```js
export default definePlugin({
  hooks: {
    "content:beforeSave": async (event, ctx) => {
      const blocks = event.content ?? [];

      // Collect unique property slugs from all propertyEmbed blocks
      const slugs = [
        ...new Set(
          blocks
            .filter(
              (b) =>
                b._type === "propertyEmbed" &&
                (typeof b.slug === "string" || typeof b.id === "string"),
            )
            .map((b) => (b.slug ?? b.id ?? "").trim())
            .filter(Boolean),
        ),
      ];

      if (slugs.length === 0) return; // no embeds on this page — pass through

      const apiUrl = await getConfiguredApiUrl(ctx);
      if (!apiUrl) return; // API not configured — allow save (fail open)

      const missing = [];

      for (const slug of slugs) {
        try {
          const property = await getProperty(ctx, apiUrl, slug);
          if (!property) {
            missing.push(slug);
          }
        } catch {
          // Network error — fail open so a temporary PWB outage doesn't block
          // editors from saving. Log the issue.
          logWarn(ctx, "embed validation fetch failed", { slug });
        }
      }

      if (missing.length > 0) {
        const list = missing.map((s) => `"${s}"`).join(", ");
        const noun = missing.length === 1 ? "property slug" : "property slugs";
        return {
          valid: false,
          error: `The following ${noun} could not be found in PWB: ${list}. Fix or remove the embed before saving.`,
        };
      }

      // All slugs verified — allow save
    },
  },

  routes: { /* unchanged */ },
});
```

---

## Failure Modes and Design Decisions

| Scenario | Behaviour | Rationale |
|---|---|---|
| Slug exists in PWB | Save proceeds normally | — |
| Slug returns 404 from PWB | Save blocked with error message | Prevents broken embeds shipping |
| PWB API not configured | Save proceeds (fail open) | No config → can't validate → don't block |
| PWB API network error | Save proceeds, warning logged | Transient outage shouldn't block editors |
| Content has no `propertyEmbed` blocks | Hook returns immediately | Zero overhead for non-property content |

Fail-open on network errors is intentional. The alternative (block saves during PWB
downtime) would be significantly worse for editors.

---

## Interaction with `content:afterSave` backlink tracker

Both hooks can coexist. `content:beforeSave` runs first — if it returns `valid: false`
the save is cancelled and `content:afterSave` never fires. If validation passes, both
the save and the backlink recording proceed normally.

---

## `astro.config.mjs` changes

None. `pwb-properties` is already registered as a trusted plugin.

---

## Testing

1. Create a post with a `propertyEmbed` block using a slug that exists in PWB — confirm
   it saves normally.
2. Edit the post, change the slug to a nonexistent value (e.g. `"not-a-real-property"`),
   and attempt to save — confirm a validation error appears and the save is blocked.
3. Configure the plugin without a PWB API URL, add any property slug, and save —
   confirm it saves without error (fail-open behaviour).
4. Simulate a network error (point the API URL at a dead host) and attempt to save —
   confirm the save succeeds with a warning in the plugin log.
