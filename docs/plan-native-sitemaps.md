# Sitemaps

**Status: done.** This was a plan to move to EmDash's native sitemaps; the move has happened.
What follows is how sitemaps work now.

| URL | Source | Covers |
|-----|--------|--------|
| `/sitemap.xml` | EmDash (native) | Sitemap index of EmDash collections with public URLs and published entries, e.g. posts (with hreflang alternates) |
| `/sitemap-<collection>.xml` | EmDash (native) | One per collection in the index |
| `/sitemap-properties.xml` | `src/pages/sitemap-properties.xml.ts` | Sale and rental listings from the active listing source — PWB, or the EmDash `properties` collection without PWB |
| `/robots.txt` | `src/pages/robots.txt.ts` | Overrides EmDash's, to advertise both `/sitemap.xml` and `/sitemap-properties.xml` |

- `/sitemap-properties.xml` is also the path of EmDash's native sitemap for the `properties`
  collection; the custom route takes precedence. It must: with PWB configured, listings come
  from PWB, and any listings imported into EmDash are unused and must not be advertised.
- The native index doesn't list `properties`, so listings appear once, via robots.txt.
- The hand-rolled `sitemap-posts.xml.ts` is gone; posts come from the native sitemap.

Tests: `src/pages/sitemap-properties.test.ts`, and the native-mode e2e check that the property
sitemap lists sale and rental listings (`e2e/native-listings.spec.ts`).
