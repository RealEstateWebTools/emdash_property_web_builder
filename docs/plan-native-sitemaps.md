# Plan: Native EmDash Sitemaps

## Current State

Two hand-rolled sitemap routes exist:

| File | Coverage | lastmod |
|------|----------|---------|
| `src/pages/sitemap-properties.xml.ts` | PWB properties | None (no lastmod) |
| `src/pages/sitemap-posts.xml.ts` | EmDash `posts` | `publishedAt` date |

Neither is referenced in a sitemap index. `robots.txt` (`src/pages/robots.txt.ts`) likely points
to one or both — check before changing.

EmDash 0.2.0 added per-collection XML sitemaps with proper `lastmod` timestamps generated
automatically from content update times.

## What Native Sitemaps Provide

- Auto-generated per-collection sitemap at `/_emdash/api/sitemap/<collection-slug>.xml`
- `lastmod` derived from the entry's actual `updatedAt` timestamp, not just `publishedAt`
- No maintenance — new entries appear automatically

## Recommended Approach

### Keep custom: `sitemap-properties.xml.ts`

Properties come from the PWB backend, not EmDash. The native sitemap feature only covers EmDash
collections. Keep the hand-rolled property sitemap as-is.

Two improvements to make to it:
- Add `<lastmod>` using property `updated_at` if the PWB API exposes it
- Add `<changefreq>sale</changefreq>` and `<priority>0.8</priority>` for listing pages

### Migrate: `sitemap-posts.xml.ts` → native EmDash sitemap

The posts collection is in EmDash. Replace the hand-rolled file with a reference to the native
endpoint, or simply delete the file and point robots.txt at the native URL.

Native endpoint (once confirmed via `npx emdash dev`):
```
/_emdash/api/sitemap/posts.xml
```

Verify by visiting `http://localhost:4321/_emdash/api/sitemap/posts.xml` in dev.

### Add: `sitemap-pages.xml.ts` or use native

Pages, team, and testimonials collections can also benefit from sitemaps if they have public URLs.
Check whether `src/pages/pages/[slug].astro` is publicly linked — if so, add their collection
to the sitemap index.

### Create: Sitemap Index

Add `src/pages/sitemap.xml.ts` as a sitemap index pointing to all sitemaps:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://example.com/sitemap-properties.xml</loc></sitemap>
  <sitemap><loc>https://example.com/_emdash/api/sitemap/posts.xml</loc></sitemap>
</sitemapindex>
```

Update `robots.txt` to reference `Sitemap: https://<domain>/sitemap.xml`.

## Implementation Steps

1. Run dev server and verify native sitemap URLs for each collection
2. Compare native posts sitemap output against current hand-rolled output
3. Update `robots.txt` to reference the new sitemap index URL
4. Delete `src/pages/sitemap-posts.xml.ts` once native endpoint is confirmed equivalent
5. Create `src/pages/sitemap.xml.ts` as the index
6. Add `lastmod` to `sitemap-properties.xml.ts` if PWB API provides `updated_at`

## Risks

- The native sitemap URL pattern needs verification against the running EmDash instance before
  removing the hand-rolled file — don't assume the path without checking
- If `robots.txt` points directly to `sitemap-posts.xml`, update it in the same PR to avoid
  a crawl gap
