# Product Improvement Execution Plan

Generated: 2026-04-13

This document converts
[docs/product-improvement-roadmap.md](product-improvement-roadmap.md) into an
execution plan.

It is intended to answer:

- what to build first
- what each milestone should include
- what success looks like before moving on
- which workstreams can be parallelized safely

This is not a speculative wishlist. It is an implementation sequence for the next
round of product work.

---

## Working Assumptions

This plan assumes the current architecture remains in place:

- **PWB** remains the system of record for listings, search, and enquiries
- **EmDash** remains the CMS and admin extension surface
- **Astro** remains the public frontend composition layer

The execution plan also assumes these product goals are still primary:

- reduce setup friction
- make the admin more productized
- improve the frontend’s commercial quality
- increase trust and lead-generation value
- make content and listing curation feel unified

---

## Delivery Strategy

The roadmap should not be implemented as one large redesign. It should be delivered
as five sequential phases.

Each phase should:

- ship usable value on its own
- leave the system in a stable state
- unlock the next layer of product work

Recommended sequence:

1. Setup and website control surface
2. Homepage merchandising and trust blocks
3. Lead capture and conversion surfaces
4. Stronger theme families and page-level polish
5. Content-data cohesion and reporting

---

## Phase Overview

| Phase | Focus | Outcome |
|---|---|---|
| 1 | Setup and website control surface | Faster onboarding and clearer admin structure |
| 2 | Homepage merchandising and trust | More compelling out-of-the-box public site |
| 3 | Leads and conversion | Stronger CTA paths and better enquiry value |
| 4 | Theme differentiation | More premium and more distinct frontend presentation |
| 5 | Cohesion and optimization | Better curation across listings/content and better measurement |

---

## Phase 1: Setup and Website Control Surface

### Goal

Create a clearer first-run and day-to-day website management experience.

### Why first

This phase improves the base product for every future customer and every later
feature. It has the highest leverage because it reduces confusion across the whole
admin.

### Milestone 1.1: Launch Checklist

#### Scope

Add an admin-facing launch checklist or site readiness panel.

The checklist should cover:

- brand identity present
- office details present
- homepage hero/content present
- menu configured
- theme chosen
- property connection healthy

#### Suggested implementation shape

- new plugin admin screen or dashboard widget
- read-only status derived from current settings/content state
- deep links to the exact pages that resolve missing items

#### Deliverables

- checklist UI
- readiness state computation helper
- links into existing admin screens

#### Acceptance criteria

- a first-time user can tell what is missing without guessing
- every missing item links to a useful editor/settings destination
- no checklist item depends on hidden/manual developer knowledge

### Milestone 1.2: Website Settings Information Architecture

#### Scope

Make key website controls easier to find and understand.

Group or relabel surfaces around:

- Brand
- Office
- Homepage
- Theme
- Search Experience
- SEO

#### Suggested implementation shape

- add a “Website” grouping or index page in admin
- improve titles and descriptions of existing plugin settings pages
- add “View page” / preview affordances

#### Deliverables

- clearer navigation labels
- short descriptive copy for important settings screens
- preview links from relevant settings pages

#### Acceptance criteria

- common website edits require fewer clicks
- settings pages explain what they affect
- the admin feels less like generic CMS navigation

### Milestone 1.3: Better Seed and Default Experience

#### Scope

Improve the default seeded experience so the site looks commercially plausible before
custom work begins.

#### Suggested implementation shape

- strengthen `seed/seed.json` demo copy and sections
- ensure brand and office defaults are coherent
- preconfigure a homepage with stronger trust and merchandising balance

#### Deliverables

- improved demo seed content
- improved default homepage section mix
- better branded defaults for trust/contact areas

#### Acceptance criteria

- a fresh seed looks intentionally designed
- the homepage does not feel sparse or generic
- there are fewer “demo smell” strings and placeholders

### Phase 1 validation

Before moving to Phase 2:

- first-run editing should feel guided
- the core website controls should be discoverable
- the seeded product should be presentation-ready

---

## Phase 2: Homepage Merchandising and Trust

### Goal

Make the public-facing site stronger without requiring bespoke development.

### Why second

Once setup and navigation are clearer, the next highest-leverage improvement is the
quality of the homepage and trust story.

### Milestone 2.1: Featured Listing Curation

#### Scope

Give editors direct control over featured listing sections.

Support:

- manual featured selection
- newest listings
- sale-only / rental-only
- area/category-based selections

#### Suggested implementation shape

- homepage section configuration
- reusable listing collection helper
- controlled fallback behavior when selection is thin

#### Deliverables

- curated listing section controls
- rendering support for featured collections
- graceful fallback rules

#### Acceptance criteria

- editors can control homepage listing emphasis without code
- sparse inventory still renders acceptably
- featured sections stay visually coherent across themes

### Milestone 2.2: Trust Block Library

#### Scope

Add reusable trust-building content blocks.

Recommended first set:

- testimonials
- office credibility / local expertise
- recent sales or key stats
- agent/team intro section

#### Suggested implementation shape

- add page parts or reusable content modules
- make these available on the homepage and general pages

#### Deliverables

- at least 2-4 trust-oriented reusable blocks
- seed/demo content using those blocks

#### Acceptance criteria

- homepage and core pages can include trust signals without custom development
- trust blocks fit the current frontend language
- editors can reuse them easily

### Milestone 2.3: Homepage Composition Pass

#### Scope

Rebalance the homepage as a productized page template rather than an ad hoc page.

Recommended section order:

1. Hero
2. Featured listings
3. Area or lifestyle positioning
4. Trust/testimonials
5. Secondary CTA
6. Latest editorial or insights

#### Deliverables

- improved homepage composition defaults
- section ordering guidance in docs/admin

#### Acceptance criteria

- homepage feels commercially persuasive
- the page has a clear narrative and CTA progression

### Phase 2 validation

Before moving to Phase 3:

- the homepage should look stronger without custom code
- trust-building modules should be part of the standard product
- editors should have real curation control over homepage listings

---

## Phase 3: Leads and Conversion

### Goal

Make lead-generation pathways clearer and more configurable.

### Why third

After setup and presentation improve, the next leverage point is conversion.

### Milestone 3.1: Property Page CTA System

#### Scope

Standardize CTA behavior on property detail pages.

Support:

- primary CTA type
- CTA label
- placement rules
- mobile behavior

Recommended CTA types:

- book viewing
- request callback
- WhatsApp/chat
- general enquiry
- valuation request

#### Deliverables

- CTA configuration surface
- updated property detail CTA rendering
- responsive behavior rules

#### Acceptance criteria

- CTA behavior is configurable without code edits
- property pages always have a clear primary action
- mobile CTA treatment feels intentional, not bolted on

### Milestone 3.2: Contact and Lead Trust Pass

#### Scope

Improve contact and enquiry-related trust surfaces.

Potential improvements:

- richer office panel
- clearer team or office identity on contact pages
- trust signals near enquiry forms

#### Deliverables

- improved contact page composition
- stronger contextual trust cues near enquiry pathways

#### Acceptance criteria

- contact-oriented pages feel credible and complete
- enquiry forms are supported by visible trust signals

### Milestone 3.3: Enquiry Attribution Baseline

#### Scope

Capture minimal useful source information with enquiries.

Baseline fields:

- page type
- property slug if applicable
- CTA source identifier
- optional referrer/campaign when available

#### Deliverables

- attribution model for enquiries
- source propagation into submission flow

#### Acceptance criteria

- an enquiry can be tied back to its page and CTA source
- no sensitive tracking assumptions are required for baseline attribution

### Phase 3 validation

Before moving to Phase 4:

- property pages should have a clear and configurable CTA strategy
- contact and enquiry surfaces should feel more trustworthy
- baseline enquiry source context should exist

---

## Phase 4: Theme Differentiation and Frontend Polish

### Goal

Make themes feel meaningfully different and raise the visual ceiling of the product.

### Why fourth

Once setup, homepage composition, and conversion are stronger, frontend refinement
has more leverage and less risk of being polish on top of weak product structure.

### Milestone 4.1: Theme Families

#### Scope

Define a small number of visibly different theme families.

Suggested first set:

- Editorial
- Coastal / Lifestyle
- Urban / Modern

Each family should affect more than tokens:

- homepage rhythm
- card proportions
- typography use
- hero treatment
- section spacing behavior

#### Deliverables

- theme family definitions
- corresponding frontend variations
- updated admin descriptions/presets

#### Acceptance criteria

- two themes should be recognizably different at a glance
- theme choice should influence layout feel, not only colors

### Milestone 4.2: Mobile-first Quality Pass

#### Scope

Refine mobile behavior for the most important frontend flows:

- property detail page
- gallery
- search and filter
- sticky CTA behavior

#### Deliverables

- spacing and hierarchy refinements
- mobile interaction fixes
- improved gallery/search ergonomics

#### Acceptance criteria

- mobile property browsing feels deliberate and usable
- CTA behavior on small screens is strong without being noisy

### Milestone 4.3: Interaction and Motion Pass

#### Scope

Improve perceived quality in high-visibility interactions:

- gallery changes
- search results updates
- homepage section reveals
- card hover/selection behavior

#### Deliverables

- meaningful motion improvements
- no gratuitous animation

#### Acceptance criteria

- interaction quality improves perceived polish
- animations support hierarchy and feedback rather than distracting from content

### Phase 4 validation

Before moving to Phase 5:

- theme families should feel distinct
- mobile core flows should be strong
- key interactions should feel premium

---

## Phase 5: Content-Data Cohesion and Optimization

### Goal

Make curation easier across listing data and editorial content, then add basic
optimization tooling.

### Why fifth

This phase benefits from the stronger setup, homepage, CTA, and theme systems that
earlier phases establish.

### Milestone 5.1: Curated Listing Collections Everywhere

#### Scope

Expand curated listing selection beyond the homepage into reusable page-building
contexts.

Examples:

- area pages
- landing pages
- lifestyle pages
- featured development pages

#### Deliverables

- reusable listing collection surface
- configurable page-part integrations

#### Acceptance criteria

- editors can combine live listing sets with editorial storytelling on multiple page
  types

### Milestone 5.2: Area and Lifestyle Patterns

#### Scope

Add productized page patterns that combine:

- editorial intro
- local context
- curated listing feed
- CTA and trust sections

#### Deliverables

- area/lifestyle content pattern definitions
- reusable sections or templates

#### Acceptance criteria

- the product can support strong location-led pages without custom assembly each time

### Milestone 5.3: Lead and CTA Reporting Baseline

#### Scope

Expose the first useful admin reporting layer for:

- CTA usage
- enquiry source breakdown
- key page conversion touchpoints

#### Deliverables

- basic reporting surface or dashboard module
- meaningful but limited metrics set

#### Acceptance criteria

- agencies can see which pathways are creating leads
- reporting remains simple and operationally useful

### Phase 5 validation

Phase 5 is complete when:

- content and listing curation feel more unified
- high-value page types can be assembled from reusable patterns
- the product exposes basic operational feedback loops

---

## Parallel Workstreams

Some work can be done in parallel, but only where write scopes stay separate.

### Safe parallel lanes

- admin IA and settings copy improvements
- homepage section/block implementation
- seed/default content improvements
- mobile/frontend polish work
- documentation updates

### Unsafe or tightly coupled lanes

- multiple simultaneous edits to the same theme/settings plugin
- homepage composition changes while section APIs are still unstable
- CTA system and enquiry attribution if both depend on the same form/request path

---

## Recommended Milestone Packaging

Keep milestone scope small enough to ship intentionally.

Recommended packaging:

- one PR per milestone
- one commit series per milestone
- no mixing of unrelated admin/frontend changes without a clear product reason

Recommended naming:

- `Phase 1 Milestone 1 launch checklist`
- `Phase 2 Milestone 1 homepage featured curation`
- `Phase 3 Milestone 1 property CTA system`

---

## Validation Commands

At the end of each milestone, run:

```bash
pnpm run test:run
pnpm run typecheck
```

If docs changed, also run:

```bash
pnpm run test:run -- src/docs-validation.test.ts
```

If frontend/admin behavior changed materially, also perform browser verification on
the affected flow.

---

## Suggested Immediate Next Milestones

If work starts now, use this exact order:

1. Phase 1 Milestone 1: Launch Checklist
2. Phase 1 Milestone 2: Website Settings Information Architecture
3. Phase 1 Milestone 3: Better Seed and Default Experience
4. Phase 2 Milestone 1: Featured Listing Curation
5. Phase 2 Milestone 2: Trust Block Library

That sequence provides the best balance of:

- visible product improvement
- low architectural churn
- strong leverage for all later work

---

## Definition of Success

This execution plan is successful if, after these phases:

- a new site can be set up quickly and confidently
- the admin feels clearly shaped for property-site outcomes
- the homepage and property pages feel commercially credible
- lead paths are obvious and configurable
- editors can curate listings and content together without friction

If a proposed task does not materially improve one of those outcomes, it should be
questioned before being added to the active plan.
