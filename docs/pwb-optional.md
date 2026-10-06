# Running With or Without PWB

The site can use the Property Web Builder (PWB) Rails backend, or run entirely on
EmDash. One setting decides which:

| `PWB_API_URL` | Listings | Site name, logo, description | PWB CMS pages (`/about-us`) | Enquiries |
|---|---|---|---|---|
| **set** | PWB API | PWB site details (EmDash settings if PWB is unreachable) | PWB | PWB leads API |
| **unset / blank** | EmDash `properties` collection | EmDash site settings | Styled 404 — use EmDash pages at `/pages/<slug>` | EmDash `enquiries` collection + email to the office |

Everything else — EmDash pages and posts, area pages, listing collections, property
embeds, lead reporting — works the same either way.

## Moving a site off PWB

1. **Import the listings** (runs against the local database):

   ```bash
   pnpm import:pwb-listings --url https://your-pwb-site.example
   ```

   It reads every sale and rental listing, writes `seed/imports/pwb-listings.json`
   (gitignored), and applies it with `emdash seed`. Listings keep their PWB slugs, so
   `/properties/<slug>` URLs don't change. Photos are downloaded into EmDash media;
   HTML descriptions become rich text.

   - `--dry-run` writes the file without applying it.
   - Re-running adds new listings and leaves existing ones (and admin edits) alone.
   - `--update` overwrites existing listings from PWB. It re-downloads their photos,
     so the old copies stay in the media library.
   - `--database <path>` targets another SQLite file.
   - Only the default language (`en`) is imported.

2. **Check it locally** with `PWB_API_URL` removed from `.env`, then `pnpm dev`.

3. **Set the site details** that PWB used to provide, in the EmDash admin:
   **Settings** (site title, tagline, logo, social handles) and **Website → Brand &
   Office** (office email — enquiry notifications go there).

4. **Publish to production (D1)** by pushing the local database:

   ```bash
   pnpm run sync:prod-db
   ```

   Then remove `PWB_API_URL` from the Worker's variables/secrets and redeploy.

To go back, set `PWB_API_URL` again: PWB takes over listings, site details and
enquiries; the imported listings stay in EmDash, unused.

## Listings in EmDash

Listings live in the **Properties** collection and are created and edited in the admin:
title, sale/rent and prices, featured flag, type, rooms, areas, address and coordinates,
photos, description and SEO fields.

- **Photos:** add a row per photo, then upload an image or pick one from the media
  library, with an optional caption. Drag rows to reorder; the first photo is the cover.
- **New listings:** a listing is for sale unless you switch on **For Rent** (switch
  both on for a listing that is both). On save, unset toggles, currency (EUR) and area
  unit (sqm) are filled in — EmDash itself doesn't apply field defaults to optional
  fields (`property-listings` plugin, `src/lib/listings/new-listing-defaults.ts`).
- **Property type** is free text: "Villa", "villa" and "types.villa" are the same type.

- Search, filters (sale/rent, type, bedrooms, bathrooms, price), sorting, map markers
  and facet counts run in memory over the published listings — up to 1,000
  (`MAX_LISTINGS` in `src/lib/listings/native-source.ts`), comfortable for an
  agency's inventory.
- Property types come from the listings themselves (`types.villa` → "Villa"), so the
  type filter only offers types in use.
- A language without its own listings shows the default-language ones.

## Enquiries without PWB

`/api/enquiries` keeps its validation and spam honeypot, then hands the enquiry to the
lead-reports plugin's `enquiries` route (in-process — anonymous requests have no
content access of their own). The plugin:

- stores it as an **unpublished** entry in the **Enquiries** collection — name, email,
  phone, message, and the listing, page type and CTA it came from — with a lead status
  (new / contacted / closed) for triage
- emails the office address from **Website → Brand & Office**, with the enquirer as
  Reply-To, when an email provider (the Resend plugin) is configured

If no provider or office email is set, the enquiry is still stored and a warning is
logged.

## For developers

- Switch: `isPwbConfigured()` in `src/lib/backend.ts`
- Listings: the `ListingSource` interface in `src/lib/listings/source.ts`;
  `getListingSource(locale)` returns the PWB client or the native source
  (`native-source.ts`). Pages, loaders, homepage merchandising and the property
  sitemap only use this interface.
- Workspace plugins reach the same source through the `pwb-host-listing-source`
  alias (`astro.config.ts`, mirrored in `vitest.config.ts`).
- Site details: `loadSiteDetails` in `src/lib/site-details.ts`
- Enquiries: `src/lib/enquiries/` and `src/plugins/lead-reports.sandbox.ts`
- Import: `scripts/import-pwb-listings.mjs` and `src/lib/listings/pwb-import.ts`
- Tests: `pnpm test:visual` runs the mocked-PWB suite; `pnpm test:native` runs the
  site without PWB (`playwright.native.config.ts`, data in
  `seed/test/native-listings.json`). Both run in CI.
- The `pwb-properties` admin plugin browses a PWB site and is only useful with PWB.
