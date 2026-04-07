# Plugin Idea: Property Backlink Tracker

**Target plugin:** `pwb-properties` (already trusted, has storage capability available)
**Hook used:** `content:afterSave`
**Effort:** Medium — new hook + storage collection + admin UI page

---

## Problem

When an editor embeds a property in a blog post, there is no record of which content
references which property. The relationship is invisible in both directions:

- From a property, you cannot see "featured in 3 articles"
- From the admin, there is no way to audit broken or stale embed references after
  a property is removed from PWB

---

## Approach

Use `content:afterSave` to scan the saved Portable Text body for `propertyEmbed` blocks
and record the slug → content relationships in plugin storage. The `pwb-properties`
admin gains a "Content Links" page showing the full reference graph, filterable by
property slug.

---

## Storage Schema

Add a `propertyLinks` collection to the plugin descriptor in `index.js`:

```js
// packages/plugins/pwb-properties/src/index.js

export function pwbPropertiesPlugin() {
  return {
    id: "pwb-properties",
    version: "0.1.0",
    format: "standard",
    entrypoint: "pwb-properties/sandbox",
    options: {},
    capabilities: ["network:fetch:any"],
    storage: {
      propertyLinks: {
        indexes: ["propertySlug", "contentId", "contentType", "updatedAt"],
      },
    },
    adminPages: [
      { path: "/", label: "Properties", icon: "list" },
      { path: "/links", label: "Content Links", icon: "link" },
      { path: "/settings", label: "Settings", icon: "settings" },
    ],
  };
}
```

Each record stored under a deterministic key `${contentType}:${contentId}`:

```js
{
  contentId: "01ABC123",          // EmDash entry ULID
  contentType: "posts",           // collection name
  contentTitle: "Top villas 2026",
  contentSlug: "top-villas-2026",
  propertySlugs: ["villa-marbella", "apt-barcelona"],
  updatedAt: "2026-04-07T13:00:00Z",
}
```

One record per content item (upserted on every save), listing all property slugs it
currently embeds. When a property is removed from a post and the post is re-saved,
the record is updated and the old slug disappears from the index.

---

## Implementation

### 1. Add the hook to `sandbox-entry.js`

```js
export default definePlugin({
  hooks: {
    "content:afterSave": async (event, ctx) => {
      // event.entry  — { id, slug, collection, data, content }
      // event.content — the Portable Text body array (if the collection has one)
      const blocks = event.content ?? [];

      const propertySlugs = extractPropertySlugs(blocks);
      const key = `${event.entry.collection}:${event.entry.id}`;

      if (propertySlugs.length === 0) {
        // This content has no embeds — delete any existing record
        await ctx.storage.propertyLinks.delete(key);
        return;
      }

      await ctx.storage.propertyLinks.put(key, {
        contentId: event.entry.id,
        contentType: event.entry.collection,
        contentTitle: event.entry.data?.title ?? "",
        contentSlug: event.entry.slug ?? "",
        propertySlugs,
        updatedAt: new Date().toISOString(),
      });
    },
  },

  routes: { /* existing routes unchanged + new /links route below */ },
});

function extractPropertySlugs(blocks) {
  const slugs = new Set();
  for (const block of blocks) {
    if (block._type === "propertyEmbed") {
      const slug = block.slug ?? block.id ?? "";
      if (slug) slugs.add(slug.trim());
    }
    // Recurse into nested blocks if needed
    if (Array.isArray(block.children)) {
      for (const child of extractPropertySlugs(block.children)) {
        slugs.add(child);
      }
    }
  }
  return [...slugs];
}
```

### 2. Add the admin route for the links page

```js
// Inside the routes block:
links: {
  handler: async (_routeCtx, ctx) => {
    const result = await ctx.storage.propertyLinks.query({
      orderBy: { updatedAt: "desc" },
      limit: 100,
    });

    if (result.items.length === 0) {
      return {
        blocks: [
          { type: "header", text: "Content Links" },
          {
            type: "section",
            text: "No content has embedded property blocks yet. Links appear here automatically when editors save posts containing Property embeds.",
          },
        ],
      };
    }

    const rows = result.items.flatMap((item) =>
      item.data.propertySlugs.map((slug) => ({
        contentTitle: item.data.contentTitle || item.data.contentSlug || item.data.contentId,
        contentType: item.data.contentType,
        propertySlug: slug,
        updatedAt: item.data.updatedAt,
      }))
    );

    return {
      blocks: [
        { type: "header", text: "Content Links" },
        {
          type: "stats",
          items: [
            { label: "Content items with embeds", value: String(result.items.length) },
            { label: "Total property references", value: String(rows.length) },
          ],
        },
        { type: "divider" },
        {
          type: "table",
          columns: [
            { key: "contentTitle", label: "Content", format: "text" },
            { key: "contentType", label: "Collection", format: "badge" },
            { key: "propertySlug", label: "Property Slug", format: "text" },
            { key: "updatedAt", label: "Last Saved", format: "relative_time" },
          ],
          rows,
        },
      ],
    };
  },
},
```

### 3. Register the `/links` admin page in `index.js`

Already shown in the storage schema section above — add `{ path: "/links", label: "Content Links", icon: "link" }` to `adminPages`.

---

## Future Extensions

- **Stale link detection**: cross-reference `propertySlugs` against the PWB API
  (already available via `network:fetch:any`) and flag any slug that returns 404.
  Add a "Stale" badge column to the links table.
- **PWB backlink push**: after updating the storage record, POST to a PWB webhook
  so the Rails backend can surface "featured in N articles" on the property show page.
- **Delete cleanup**: add a `content:afterDelete` hook to remove the storage record
  when content is deleted.

---

## Testing

1. Create a post with two `propertyEmbed` blocks (different slugs) and save it.
2. Open the admin → Properties → Content Links.
3. Confirm both slugs appear in the table linked to that post.
4. Edit the post, remove one embed, save again.
5. Confirm the table now shows only one slug for that post.
6. Delete the post — the record should be removed (once `content:afterDelete` is added).
