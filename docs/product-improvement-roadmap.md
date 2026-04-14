# Product Improvement Roadmap

Generated: 2026-04-13

This document turns the current product feedback into a concrete improvement plan
for `emdash_property_web_builder`.

It complements the broader strategic view in
[docs/product-roadmap.md](product-roadmap.md) and focuses on the next layer of
product shaping:

For the milestone-by-milestone implementation sequence, see
[docs/product-improvement-execution-plan.md](product-improvement-execution-plan.md).

- making the product easier to set up
- making the admin feel more productized
- improving the frontend quality and differentiation
- increasing trust and lead-generation value
- tightening the relationship between imported property data and editorial content

The central question behind this plan is simple:

**How do we make this feel like a serious real-estate website product rather than a
CMS install with property features added on?**

---

## Product Standard

Every major part of the product should help the customer answer one of these
questions quickly:

1. How do I make the site look good?
2. How do I make the site trustworthy?
3. How do I get more leads?

If a screen, feature, or workflow does not clearly support one of those outcomes,
it should be deprioritized, simplified, or removed.

---

## Current Product Gaps

The project has improved significantly in visual quality and admin flexibility, but
the biggest product gaps are still structural rather than cosmetic.

### 1. Setup is still too fragmented

Important configuration is spread across multiple places:

- theme settings
- site profile settings
- content editing
- seed data / defaults
- plugin-specific settings

This makes the first-run experience feel like configuration work instead of product
onboarding.

### 2. The admin still exposes too much CMS shape

The admin is capable, but many screens still feel like raw EmDash concepts rather
than an opinionated property-site control panel.

Examples:

- settings names are technically accurate but not outcome-oriented
- important brand and trust content is split across separate screens
- theme controls are improving, but other areas still rely on generic CMS behavior

### 3. The frontend is stronger, but not yet clearly differentiated

The site now looks better, but it still needs more distinctive layout systems,
stronger storytelling blocks, and more premium interaction behavior.

### 4. Lead generation is not yet a first-class product concern

The site can display listings and accept enquiries, but conversion-oriented tooling
is still thin:

- CTA strategy is not unified
- lead source tracking is limited
- trust elements are not heavily productized
- there is no obvious optimization loop for enquiry performance

### 5. Property data and editorial curation still feel separate

The architecture is correct, but the product experience needs to do more work to
make the split feel seamless for editors.

---

## Product Thesis

The strongest version of the product is:

**a website operating system for small and medium property agencies**

That means it should provide:

- a fast path to a credible launch
- strong defaults for branding and layout
- easy curation of listings and pages together
- clear trust-building sections
- built-in lead capture and operational signals

The goal is not to make every part infinitely configurable. The goal is to make the
right things easy and the advanced things available when needed.

---

## Improvement Themes

This roadmap is organized into five improvement themes.

### Theme 1. Setup and Onboarding

Goal:

Make the first 30 minutes of product use feel guided, fast, and confidence-building.

Desired outcome:

An agency can go from install to a credible public site without needing to
understand the underlying CMS model.

### Theme 2. Productized Admin Experience

Goal:

Replace generic admin concepts with domain-specific controls and clearer editing
flows.

Desired outcome:

The admin feels like a real-estate website builder, not just an embedded CMS.

### Theme 3. Frontend Quality and Differentiation

Goal:

Push the frontend from “good demo site” to “commercially convincing agency site”.

Desired outcome:

Themes feel intentionally designed, pages feel premium, and the product stands out
against generic property templates.

### Theme 4. Lead Generation and Trust

Goal:

Treat enquiries, trust signals, and conversion pathways as core product surfaces.

Desired outcome:

The site does not just display listings well. It helps agencies convert visitors
into enquiries.

### Theme 5. Content and Data Cohesion

Goal:

Make the boundary between PWB listing data and EmDash content feel operationally
simple.

Desired outcome:

Editors can curate listings and content together without needing to care which
system owns which data model.

---

## Theme 1: Setup and Onboarding

### Problem

The current product requires too much mental assembly at setup time. The user has to
discover:

- where brand identity lives
- where office/contact details live
- where theme controls live
- how to make the homepage look complete
- how to tell whether the property feed is healthy

### Plan

#### 1. Add a guided setup flow

Create a first-run setup experience that covers:

- brand name
- logo
- office address
- phone and email
- homepage hero content
- core theme direction
- primary CTA style
- property connection status

This should be a guided sequence, not a loose collection of settings pages.

#### 2. Add setup completion status

Add a small “site readiness” or “launch checklist” module showing whether the
following are configured:

- site identity
- contact details
- homepage hero
- navigation
- social/SEO metadata
- property connection

#### 3. Improve defaults and seed quality

The product should always look plausible immediately after seed.

Improve demo defaults for:

- brand naming
- trust copy
- contact details
- homepage sections
- curated featured listings

#### 4. Add direct links from checklist items to editing surfaces

Each incomplete setup item should deep-link to the exact admin page that resolves
it.

### Delivery phases

#### Quick win

- Add a launch checklist widget
- Add richer default seed values
- Link existing settings pages together

#### Medium lift

- Create a dedicated setup wizard plugin or admin flow

#### Longer-term

- Persist onboarding progress and re-open partially completed setup

### Success criteria

- A first-time user can complete a credible setup in under 15 minutes
- Support/debugging questions about “where do I change X?” decrease sharply
- The seeded site looks commercially believable before any code edits

---

## Theme 2: Productized Admin Experience

### Problem

The admin still has strong CMS DNA. That is technically fine, but product-wise it
creates friction. Users think in terms like:

- brand
- office
- homepage
- search results
- property cards
- enquiries

They do not think in terms like:

- generic plugin settings
- collection wiring
- content primitives

### Plan

#### 1. Reframe settings by outcome

Group key admin areas into user-facing concepts:

- Brand
- Office
- Homepage
- Search Experience
- Property Display
- Leads
- SEO

These can still map to EmDash/plugin internals behind the scenes.

#### 2. Add inline explanation and recommended defaults

Every setting that changes appearance or behavior should explain:

- what changes
- where it shows up
- when to use it

Theme presets are the right model here.

#### 3. Add live preview affordances

Wherever possible, provide:

- “View page”
- “Preview result”
- “Open relevant frontend screen”

This is especially important for:

- homepage settings
- property card settings
- search settings
- office/contact settings

#### 4. Collapse advanced controls

Keep the primary workflow simple and hide secondary complexity behind an `Advanced`
toggle or a separate section.

#### 5. Improve empty states

Replace blank or technical screens with domain-specific prompts:

- “Add your office contact details”
- “Choose a homepage hero”
- “Feature listings on your homepage”

### Delivery phases

#### Quick win

- Rename/admin-label key settings pages
- Add short context text to all important settings pages
- Add preview links

#### Medium lift

- Create a top-level “Website” area in admin that groups high-value settings

#### Longer-term

- Create a fully productized dashboard landing page for editors and admins

### Success criteria

- Fewer clicks to reach common edits
- Less need for technical explanation during onboarding
- Admin navigation feels agency-oriented rather than CMS-oriented

---

## Theme 3: Frontend Quality and Differentiation

### Problem

The frontend is better, but still needs stronger personality and more visible
variation between design directions.

If the product is sold partly on frontend quality, themes must affect layout,
storytelling, and merchandising patterns, not only color and spacing.

### Plan

#### 1. Expand theme direction beyond tokens

Move from “palette + density + surface + motion” toward more visibly different site
families, for example:

- editorial boutique agency
- premium coastal/lifestyle
- urban apartment specialist
- family suburban agency

Each family should influence:

- homepage composition
- card proportions
- section rhythm
- hero treatment
- typography system

#### 2. Productize homepage sections

Add stronger page-part building blocks for:

- featured collections
- neighborhood/area highlights
- testimonial/trust sections
- valuation CTA
- latest journal content
- team/agent profiles

#### 3. Improve mobile-first polish

Prioritize:

- property detail readability
- gallery interaction
- search/filter usability
- CTA stickiness without clutter

#### 4. Improve perceived speed and interaction quality

Use measured motion and transitions in places where users notice quality:

- search result changes
- gallery interactions
- featured listing modules
- page section reveals

### Delivery phases

#### Quick win

- Improve homepage section library
- Refine mobile spacing and hierarchy on core pages

#### Medium lift

- Add 2-3 layout-level theme families

#### Longer-term

- Add site-style presets that change both theme settings and homepage composition

### Success criteria

- Themes feel meaningfully different, not cosmetically different
- The homepage can look premium without custom code
- Mobile property pages feel intentional and conversion-ready

---

## Theme 4: Lead Generation and Trust

### Problem

The current product can present listings, but it does not yet fully behave like a
lead-generation product for agencies.

### Plan

#### 1. Unify call-to-action strategy

Standardize configurable CTAs across property and site pages:

- book viewing
- request callback
- WhatsApp/chat
- valuation request
- general enquiry

Each CTA should be configurable by:

- label
- destination/action
- placement
- mobile behavior

#### 2. Add trust modules

Make trust-building blocks easy to configure:

- testimonials
- recent sales / success stats
- local expertise copy
- office credentials
- team profiles

#### 3. Add lead source context

Capture and expose useful context for enquiries:

- page type
- property slug if relevant
- CTA source
- referrer or campaign when available

#### 4. Add conversion-oriented page patterns

Create reusable layouts/sections optimized for:

- valuation landing pages
- area pages
- featured development pages
- high-intent contact pages

### Delivery phases

#### Quick win

- Add clearer CTA configuration for property detail pages
- Improve contact/office trust presentation

#### Medium lift

- Add enquiry attribution and source capture
- Add trust block components in page parts

#### Longer-term

- Add reporting/dashboard surfaces for lead and CTA performance

### Success criteria

- Enquiry paths are obvious and configurable
- More pages include trust signals without bespoke development
- Agencies can understand where leads came from

---

## Theme 5: Content and Data Cohesion

### Problem

The underlying architecture is good, but the user experience around curation still
needs to better hide the split between PWB-owned listing data and EmDash-owned site
content.

### Plan

#### 1. Add curated listing collections

Give editors easy ways to feature listings based on:

- manual selection
- newest
- featured flag
- sale/rent
- area/location
- price band

#### 2. Add area and lifestyle storytelling patterns

Create content structures or page parts that let editors combine:

- intro copy
- featured listings
- map/location framing
- local highlights

#### 3. Improve sparse-data fallbacks

The frontend should remain strong even when data quality is incomplete.

Improve fallbacks for:

- missing images
- short descriptions
- missing area detail
- low inventory counts

#### 4. Add merchandising controls

Editors should be able to answer:

- which listings appear on the homepage
- which listings appear on area pages
- which content blocks accompany them

without developer changes.

### Delivery phases

#### Quick win

- Add featured listing collection controls for homepage and landing sections

#### Medium lift

- Add area page and curated collection page patterns

#### Longer-term

- Add richer cross-linking between editorial content, agents, and listings

### Success criteria

- Editors can build compelling pages from live listing data without code
- Low-data situations degrade gracefully
- The product feels unified despite hybrid ownership of data

---

## Recommended Delivery Order

This is the suggested sequence for the next major product cycle.

### Phase 1: Foundation and first-run quality

Build first:

- launch checklist
- better seed/default content
- stronger admin labeling and contextual guidance
- richer homepage section defaults

Reason:

This has the highest immediate product value and lowers friction for every later
feature.

### Phase 2: Homepage and trust/lead productization

Build next:

- trust modules
- CTA strategy improvements
- homepage merchandising blocks
- office/contact presentation improvements

Reason:

This turns the product from a nicer frontend into a more commercially useful agency
site.

### Phase 3: Theme system expansion

Build next:

- stronger theme families
- layout-level differentiation
- mobile-first refinements

Reason:

This increases perceived product quality and sharpens market differentiation.

### Phase 4: Content-data cohesion

Build next:

- curated listing collections
- area/lifestyle page patterns
- merchandising controls

Reason:

This improves editorial power without compromising the PWB/EmDash split.

### Phase 5: Reporting and optimization

Build later:

- enquiry attribution
- CTA analytics
- admin performance dashboards

Reason:

This is high-value, but the earlier phases should create clearer and more valuable
events to measure first.

---

## Quick Wins Backlog

These are the highest-signal smaller improvements to tackle soon.

- Add a “Launch Checklist” admin widget
- Add a “Website” grouping for brand, office, theme, and homepage settings
- Add preview links from key settings pages
- Add featured listing controls for the homepage
- Add a reusable testimonial/trust section block
- Add configurable sticky CTA treatment on property detail pages
- Improve empty states for homepage and website settings
- Improve mobile property-detail spacing and CTA hierarchy

---

## Big Bets Backlog

These are larger initiatives that would materially raise the ceiling of the product.

- Full setup wizard for first-run site creation
- Distinct layout-based theme families
- Area page builder with curated listings and local content
- Lead attribution and conversion reporting
- Productized agency dashboard landing page inside admin

---

## What Not To Do Yet

To keep the roadmap disciplined, avoid these until the product basics are stronger:

- adding many narrow one-off settings without improving information architecture
- mirroring listing data into EmDash for convenience
- building analytics before enquiry and CTA flows are well shaped
- shipping many new section types without improving defaults and curation controls
- over-expanding theme controls before stronger preset systems exist

---

## Suggested Next Implementation Track

If this roadmap is converted into active build work, the best next implementation
track is:

1. Create a `Launch Checklist` admin surface
2. Consolidate brand/office/theme/homepage settings into a clearer “Website” flow
3. Add homepage featured-listing curation controls
4. Add trust/testimonial page-part blocks
5. Add configurable property-page CTA controls

That sequence gives the highest product return for the least architectural churn.
