# Plugin Idea: Property JSON-LD Structured Data

**Target plugin:** `pwb-properties` (already trusted, has `network:fetch:any`)
**Hook used:** `page:metadata`
**Effort:** Medium — new hook, one PWB API fetch per embedded property per page render

---

## Problem

Pages that contain `propertyEmbed` Portable Text blocks render rich property cards,
but search engines see no structured data. There is no `schema.org/RealEstateListing`
in the `<head>`, so Google cannot index price, bedrooms, location, or listing type
from these pages.

---

## Approach

The `page:metadata` hook fires during page rendering and lets plugins contribute
arbitrary content to the document `<head>`. We scan the current page's Portable Text
content for `propertyEmbed` blocks, fetch each property from the PWB API, and return
one `application/ld+json` script per property.

`pwb-properties` is already a trusted plugin with `network:fetch:any`, so no new
capabilities or plugin registration is needed.

---

## Implementation

### 1. Add the hook to `sandbox-entry.js`

```js
// packages/plugins/pwb-properties/src/sandbox-entry.js

export default definePlugin({
  hooks: {
    "page:metadata": async (event, ctx) => {
      // event.content is the page's Portable Text body (array of blocks)
      const blocks = event.content ?? [];

      // Collect all propertyEmbed slugs on this page
      const slugs = blocks
        .filter((b) => b._type === "propertyEmbed" && typeof b.slug === "string")
        .map((b) => b.slug.trim())
        .filter(Boolean);

      if (slugs.length === 0) return;

      const apiUrl = await getConfiguredApiUrl(ctx);
      if (!apiUrl) return;

      const scripts = [];

      for (const slug of slugs) {
        try {
          const property = await getProperty(ctx, apiUrl, slug);
          if (!property) continue;

          const ld = buildRealEstateListingLd(property, apiUrl);
          scripts.push({
            tag: "script",
            type: "application/ld+json",
            content: JSON.stringify(ld),
          });
        } catch {
          // non-fatal: skip this property if the fetch fails
        }
      }

      return { scripts };
    },
  },

  routes: { /* existing routes unchanged */ },
});
```

### 2. Add the JSON-LD builder helper

```js
function buildRealEstateListingLd(property, apiUrl) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title,
    url: `${apiUrl}/properties/${property.slug}`,
  };

  if (property.formatted_price) {
    ld.price = property.formatted_price;
  }
  if (property.currency_code) {
    ld.priceCurrency = property.currency_code;
  }
  if (property.count_bedrooms != null) {
    ld.numberOfRooms = property.count_bedrooms;
  }
  if (property.address || property.city) {
    ld.address = {
      "@type": "PostalAddress",
      streetAddress: property.address ?? undefined,
      addressLocality: property.city ?? undefined,
      addressRegion: property.region ?? undefined,
      addressCountry: property.country_code ?? undefined,
    };
  }
  if (property.primary_image_url) {
    ld.image = property.primary_image_url;
  }
  if (property.for_sale && !property.for_rent) {
    ld.businessFunction = "http://purl.org/goodrelations/v1#Sell";
  }
  if (property.for_rent && !property.for_sale) {
    ld.businessFunction = "http://purl.org/goodrelations/v1#LeaseOut";
  }

  return ld;
}
```

### 3. No changes needed to `astro.config.mjs`

`pwb-properties` is already registered as a trusted plugin. The new hook is picked up
automatically.

---

## What the output looks like

For a blog post containing a single property embed, EmDash injects this into `<head>`:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "RealEstateListing",
  "name": "Beautiful Villa Marbella",
  "url": "https://example.com/properties/beautiful-villa-marbella",
  "price": "€1,250,000",
  "priceCurrency": "EUR",
  "numberOfRooms": 4,
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Marbella",
    "addressRegion": "Andalusia",
    "addressCountry": "ES"
  },
  "image": "https://example.com/photos/villa.jpg"
}
</script>
```

---

## Caveats

- Each embedded property costs one extra fetch during SSR. Cache headers from PWB
  determine how often this re-fetches in production (Cloudflare edge caches the Worker
  response, not individual fetches within it).
- If `pwb-properties` API URL is not configured, the hook returns early with no output.
- If a property slug doesn't exist in PWB, it is silently skipped — the page still renders.
- Pages with no `propertyEmbed` blocks are unaffected (early return on empty slugs list).

---

## Testing

1. Create a blog post with at least one `propertyEmbed` block and publish it.
2. View the page source and confirm a `<script type="application/ld+json">` block appears.
3. Paste the JSON-LD into Google's [Rich Results Test](https://search.google.com/test/rich-results).
4. Confirm the result shows a valid `RealEstateListing` entity.
5. For a page with no property embeds, confirm no JSON-LD script is injected.
