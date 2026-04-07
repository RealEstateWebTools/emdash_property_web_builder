# Plugin Idea: Property Stats Dashboard Widget

**Target plugin:** `pwb-properties`
**API used:** `adminWidgets` in the plugin descriptor
**Effort:** Low — one widget handler, uses existing `searchProperties` helper

---

## Problem

To see a live count of properties (total, for sale, for rent), an admin must navigate
to the Properties plugin page and wait for the list to load. There is no at-a-glance
view on the main EmDash dashboard.

---

## Approach

Add an `adminWidgets` entry to the `pwb-properties` plugin descriptor. The widget
calls the existing PWB properties API (page 1, per_page 1) with sale/rental filters
to get meta totals, then renders a compact stats block. Appearing on the dashboard as
a `size: "third"` card alongside other site stats.

---

## Implementation

### 1. Add the widget to the plugin descriptor (`index.js`)

```js
export function pwbPropertiesPlugin() {
  return {
    id: "pwb-properties",
    version: "0.1.0",
    format: "standard",
    entrypoint: "pwb-properties/sandbox",
    options: {},
    capabilities: ["network:fetch:any"],
    adminPages: [
      { path: "/", label: "Properties", icon: "list" },
      { path: "/settings", label: "Settings", icon: "settings" },
    ],
    adminWidgets: [
      { id: "pwb-stats", title: "Properties", size: "third" },
    ],
  };
}
```

### 2. Add the widget route to `sandbox-entry.js`

The widget route key must match the widget `id` declared above.

```js
export default definePlugin({
  routes: {
    // Existing admin and settings routes...

    // Dashboard widget handler
    "pwb-stats": {
      handler: async (_routeCtx, ctx) => {
        const apiUrl = await getConfiguredApiUrl(ctx);

        if (!apiUrl) {
          return {
            blocks: [
              {
                type: "context",
                text: "PWB API URL not configured. Open Properties → Settings.",
              },
            ],
          };
        }

        try {
          // Three lightweight fetches: all / sale / rental (page 1, 1 result each)
          const [all, sale, rental] = await Promise.all([
            searchProperties(ctx, apiUrl, 1, undefined),
            searchProperties(ctx, apiUrl, 1, "sale"),
            searchProperties(ctx, apiUrl, 1, "rental"),
          ]);

          return {
            blocks: [
              {
                type: "stats",
                items: [
                  { label: "Total", value: String(all?.meta?.total ?? "—") },
                  { label: "For Sale", value: String(sale?.meta?.total ?? "—") },
                  { label: "For Rent", value: String(rental?.meta?.total ?? "—") },
                ],
              },
              {
                type: "actions",
                elements: [
                  {
                    type: "button",
                    text: "Browse Properties",
                    action_id: "open_plugin:/",
                  },
                ],
              },
            ],
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Could not load stats.";
          return {
            blocks: [
              { type: "banner", variant: "error", title: message },
            ],
          };
        }
      },
    },
  },
});
```

---

## What the widget looks like on the dashboard

```
┌─────────────────────────┐
│ Properties              │
│                         │
│  Total    For Sale  For Rent
│   142       89       53  │
│                         │
│  [Browse Properties]    │
└─────────────────────────┘
```

As a `size: "third"` widget it occupies one third of the dashboard row alongside
other third-width widgets from other plugins.

---

## Performance Notes

The widget makes 3 PWB API requests on every dashboard load. Each request fetches only
1 result (the `meta.total` is accurate regardless of page size). On a fast PWB instance
these complete in parallel in ~100–200 ms.

If the dashboard load time is a concern, `per_page: 1` is already minimal. An
alternative is to cache the totals in plugin KV:

```js
const CACHE_KEY = "cache:stats";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const cached = await ctx.kv.get(CACHE_KEY);
if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
  return renderStats(cached.all, cached.sale, cached.rental);
}
const [all, sale, rental] = await Promise.all([...]);
await ctx.kv.set(CACHE_KEY, { all: all.meta.total, sale: sale.meta.total, rental: rental.meta.total, ts: Date.now() });
return renderStats(all.meta.total, sale.meta.total, rental.meta.total);
```

---

## `astro.config.mjs` changes

None. `pwb-properties` is already registered as a trusted plugin.

---

## Testing

1. Configure the PWB API URL in Properties → Settings.
2. Navigate to the EmDash admin dashboard (`/_emdash/admin`).
3. Confirm the "Properties" widget appears with three stat items.
4. Confirm the "Browse Properties" button navigates to the plugin page.
5. Remove the PWB API URL and reload — confirm the widget shows the configuration
   prompt instead of crashing.
