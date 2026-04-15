# Code Review & Improvement Roadmap — April 2026

Generated: 2026-04-15

A fresh end-to-end review of the `emdash_property_web_builder` codebase, covering
current state, identified gaps, and a prioritised improvement roadmap.

For the broader strategic view see [docs/product-roadmap.md](product-roadmap.md).
For the test-focused plan see [docs/tdd-implementation-plan.md](tdd-implementation-plan.md).
For the execution sequence see [docs/product-improvement-execution-plan.md](product-improvement-execution-plan.md).

---

## Current State Assessment

### Architecture

| Layer | Technology | Role |
|-------|-----------|------|
| Frontend | Astro (SSR, Cloudflare adapter) | Rendering, routing, composition |
| CMS | EmDash 0.2.x | Pages, posts, menus, admin UI, plugins |
| Listings backend | PWB Rails API | Properties, search, enquiries |
| Database (dev) | SQLite via better-sqlite3 | Local EmDash content |
| Database (prod) | Cloudflare D1 | EmDash content at the edge |
| Media (prod) | Cloudflare R2 | Images and uploads |
| i18n | Astro built-in | en (default), es, fr |

### Strengths

- Clean component architecture with clear separation of concerns
- Multi-locale support (en/es/fr) throughout, with fallback system
- Sophisticated theme system: 7 palettes, density, motion, header modes
- Photo gallery with fullscreen lightbox, touch and keyboard support
- Good accessibility: ARIA labels, semantic HTML, keyboard navigation
- 30 test files covering utilities, formatters, validators, route guards
- Extensive documentation across 40+ markdown files

### Gaps Identified

- `PropertyDetail.astro` is ~830 lines — gallery, facts, and enquiry section mixed together
- Gallery and header toggle logic lives in inline `<script>` blocks (not Stimulus controllers)
- Valuation plugin (`packages/plugins/pwb-valuation`) exists but is not fully integrated
- PWB admin plugin is read-only — no write capability from EmDash admin
- Contact page not explicitly seeded in `seed/seed.json`
- No WebP/responsive image optimisation on property photos
- No `RealEstateListing` JSON-LD schema on property detail pages
- Blog lacks pagination and related posts
- Language switcher is hidden on mobile
- No saved search / property alert feature

---

## Improvement Roadmap

### Priority 1 — Code Quality & Maintainability

**1.1 Decompose `PropertyDetail.astro`**

The file is ~830 lines mixing gallery markup, property facts, the enquiry section,
and an inline script block. Suggested split:

- `PropertyGallery.astro` — photo strip, fullscreen overlay, thumbnail row
- `PropertyFacts.astro` — beds/baths/area/garage fact grid
- `PropertyEnquiry.astro` — contact form section
- `PropertyDetail.astro` becomes an orchestrator under ~200 lines

**1.2 Move inline scripts to Stimulus controllers**

Gallery keyboard/touch logic and the header mobile-menu toggle are currently
inline `<script>` tags. Moving them to Stimulus controllers makes them testable
and aligns with the CLAUDE.md preference for Stimulus.js.

Target controllers:
- `gallery_controller.js` — keyboard, touch, fullscreen logic
- `mobile_menu_controller.js` — header menu open/close

**1.3 Audit and clean up locale.ts**

Both `src/components/PropertyDetail.astro` and `src/lib/locale.ts` are modified
in the working tree. Review for consistency, then commit or discard.

---

### Priority 2 — Content & Schema Expansion

**2.1 Add Contact page to seed schema**

A contact page entry is not explicitly seeded. Add to `seed/seed.json`:

```json
{
  "collection": "pages",
  "slug": "contact",
  "title": "Contact Us",
  "fields": ["heading", "sub_heading", "contact_info_blocks", "office_locations"]
}
```

**2.2 Enrich Posts and Pages with SEO fields**

Add to both collections:
- `seo_title` (string) — overrides the auto-generated `<title>`
- `seo_description` (string) — overrides the auto-generated meta description
- `published_at` (date) — explicit publish date for Posts
- `author` (string) — byline for Posts

**2.3 Add Testimonials collection**

Fields: `name`, `role`, `quote`, `property_slug` (optional), `rating` (1–5),
`featured` (boolean).

Enables curated testimonials in homepage trust blocks and property pages via
the `pwb-page-parts` plugin.

**2.4 Add Team/Agents collection**

Fields: `name`, `title`, `bio`, `photo` (image), `email`, `phone`,
`speciality`, `languages`.

Enables an "Our Team" page and agent attribution on individual property pages.

---

### Priority 3 — User Experience

**3.1 Property search**

- Add a map/grid view toggle on `/properties` — Leaflet is already imported
- Sync active filters to URL query params so searches are shareable
- Add a "No results" state with actionable suggestions (widen location, adjust price)

**3.2 Homepage merchandising**

- Make featured property group order admin-configurable (drag-and-drop in EmDash)
- Add a "Recently viewed" section (local storage, no backend required)
- Surface a "Price reduced" badge if PWB API exposes `price_reduced_at`

**3.3 Property detail**

- Add a sticky enquire CTA bar that appears once the main form scrolls out of view
- Add native share API button (copy link fallback) on property detail
- Add print-friendly styles for property spec sheet
- Expand similar properties carousel with a "view more" link

**3.4 Mobile navigation**

- Reinstate language switcher on mobile (currently hidden in header collapse)
- Add swipe-to-dismiss gesture for the mobile slide-out menu
- Add a floating search FAB on mobile property index

---

### Priority 4 — SEO & Performance

**4.1 Image optimisation**

- Wrap property photos in Astro's `<Image />` with `format="webp"` and `widths`
- Add `fetchpriority="high"` on the first gallery image (LCP element)
- Audit all `<img>` tags for explicit `width` and `height` to prevent layout shift

**4.2 Structured data**

- Add `RealEstateListing` JSON-LD on property detail pages (price, address,
  bedrooms, property type)
- Add `Organization` JSON-LD on homepage with `ContactPoint` and `sameAs` links
- Align `BreadcrumbList` JSON-LD with the visual breadcrumb component

**4.3 Sitemap**

- Verify `sitemap-properties.xml` includes `lastmod` and `priority` per entry
- Add `sitemap-posts.xml` for blog content
- Add sitemap references in `robots.txt`
- Submit to Google Search Console

**4.4 Core Web Vitals**

- Baseline Lighthouse scores on the deployed Workers URL
- Review Google Fonts loading: add `preconnect` and `font-display: swap`
- Check Cloudflare cache headers on R2 image responses

---

### Priority 5 — Feature Completeness

**5.1 Complete the Valuation plugin**

The `packages/plugins/pwb-valuation` package exists but is incomplete. Define:
- What the form collects (address, property type, bedrooms, condition)
- Where it submits (PWB API endpoint or EmDash form plugin)
- How results display (estimated range, follow-up CTA)
- Add a "Get a valuation" CTA block to `pwb-page-parts` for embedding on pages

**5.2 Blog improvements**

- Pagination on `/posts` — add `page` param, 10 posts per page
- Related posts at the bottom of individual posts (matched by shared tags)
- Email subscription CTA block using the Resend plugin
- Estimated reading time in post metadata

**5.3 Property alerts / saved searches**

- Allow visitors to save a search and receive email alerts
- Requires a PWB API endpoint + Resend plugin integration
- High-value lead capture feature for real estate

**5.4 Make PWB admin plugin writable**

Define which fields should be editable from EmDash vs PWB:
- Editorial fields (description highlights, featured status) → EmDash admin
- Structured data (price, bedrooms, address) → stays in PWB
- Implement PUT/PATCH calls through the PWB public API

---

### Priority 6 — Testing & Observability

**6.1 E2E test expansion**

Current `e2e/` coverage is limited. Add:
- Property search → filter → detail → enquiry form submission
- Locale switching (en → es → fr) across key pages
- Visual regression screenshots per theme palette

**6.2 API contract tests**

The `src/lib/pwb/` client is the most critical integration point. Add tests that:
- Mock PWB responses and assert the formatter/validator chain handles edge cases
- Verify graceful degradation when PWB is unavailable
- Cover null/missing fields in property responses

**6.3 Observability**

- Integrate Web Vitals reporting (Cloudflare Analytics or a lightweight beacon)
- Log PWB unavailability to an observable endpoint (not just a silent fallback)
- Evaluate Sentry for client-side error tracking

---

### Priority 7 — Developer Experience

**7.1 Local development**

- Verify `.env.example` documents all required environment variables
- Add a `pnpm check` script: TypeScript + test + lint in sequence
- Document the local → staging → production promotion workflow in one place

**7.2 Seed profiles**

- Add a `seed:demo` profile with rich realistic data:
  20+ properties, multiple agents, 5+ blog posts, testimonials
- Add a `pnpm reset` script: drop DB + re-seed + regenerate types in one command

**7.3 Plugin documentation**

Each package in `packages/plugins/` should have a `README.md` covering:
- Configuration options
- EmDash hooks used
- Admin UI screenshots or description
- Example seed entry (if applicable)

---

## Suggested Execution Order

| Sprint | Focus | Expected Impact |
|--------|-------|----------------|
| 1 | Decompose PropertyDetail, Stimulus controllers, Contact page seed | Code health, maintainability |
| 2 | JSON-LD structured data, sitemap, image optimisation | Organic search ranking |
| 3 | Sticky enquiry CTA, homepage merchandising order | Conversion rate |
| 4 | Testimonials + Team collections, trust signals | Social proof |
| 5 | Blog pagination, related posts, reading time | Content UX |
| 6 | E2E tests, API contract tests | Reliability |
| 7 | Valuation plugin completion | Lead capture |
| 8 | Property alerts / saved searches | Lead capture |

---

## Highest-Leverage Quick Wins

If only three things should be tackled first:

1. **JSON-LD for property listings** — `RealEstateListing` structured data directly
   affects how Google displays properties in search results. Low effort, high SEO reward.

2. **Image optimisation (WebP + fetchpriority)** — LCP is a Core Web Vital ranking
   signal. Property photo galleries are the heaviest page element.

3. **Sticky enquiry CTA on property detail** — The enquiry form is the primary
   conversion point. Keeping a CTA visible as users scroll through photos and details
   will measurably increase enquiry rate.
