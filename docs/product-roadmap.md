# Product Roadmap

This document turns the current product direction into a practical roadmap for
`emdash_property_web_builder`.

It is written against the architecture the project already has today:

- **PWB** is the canonical backend for listings, search, and enquiries
- **EmDash** is the CMS for pages, posts, menus, and admin extensibility
- **Astro** is the frontend layer that composes both systems

The roadmap is intentionally opinionated. It prioritizes shipping a coherent product over
maximizing feature count.

---

## Product Positioning

The strongest version of this product is not:

- “just another real-estate website template”
- “just a CMS with a property plugin”
- “just a frontend for an existing Rails backend”

The strongest version is:

**a unified operating system for small property agencies**

That means the product should help an agency:

- manage listings
- manage site content
- merchandise properties on the website
- improve search and SEO visibility
- capture and route leads
- operate confidently without technical staff

The key strategic advantage is the hybrid model:

- PWB already handles structured listing operations
- EmDash gives you a real CMS and flexible admin extensibility
- Astro gives you a modern, performant frontend

The roadmap should amplify that advantage rather than undermine it.

---

## Core Product Principles

These principles should guide decisions about what to build next.

### 1. Keep one source of truth per concern

- Listings live in PWB
- CMS content lives in EmDash
- The frontend reads from both

Do not mirror listing data into EmDash just to make editing easier.

### 2. Optimize for agency staff, not developers

The product will be judged by how easy it is for editors and admins to operate day to day:

- edit listings
- update homepage content
- publish articles
- curate featured inventory
- handle enquiries

### 3. Improve workflows before expanding feature surface

Before adding many new features, improve:

- save reliability
- validation quality
- role boundaries
- diagnostics
- preview/publish flow
- admin UX

### 4. Favor operational leverage

The best features reduce:

- setup time
- staff time
- agency error rate
- support burden

### 5. Make marketing and conversion part of the product

The product should not stop at CRUD. It should help agencies:

- rank better
- convert more visitors
- present listings better
- route leads faster

---

## Current State

The project already has several strong foundations:

### Strengths

- server-rendered Astro frontend
- clear separation between CMS content and listing data
- tested PWB API client layer in `src/lib/pwb/`
- EmDash admin already running inside the same app
- plugin system now in use for PWB property browsing

### Current gaps

- property editing is not yet integrated into EmDash
- there is no unified workflow for listing + content + merchandising
- diagnostics and setup feedback are still thin
- homepage/search merchandising is still mostly code-driven
- the product is not yet opinionated enough for agency outcomes

---

## Strategic Goal

The next broad goal should be:

**make the admin feel like one back office for agency staff**

In practice, that means an editor should be able to:

1. edit a property
2. adjust related site copy
3. curate where listings appear
4. confirm the public result
5. monitor leads and site health

without bouncing unnecessarily between tools or needing developer help.

---

## Roadmap Structure

The roadmap is split into:

- `Now` — must improve core usability and reliability
- `Next` — must improve business outcomes
- `Later` — differentiators and scale features

Each phase includes:

- goals
- major initiatives
- what success looks like
- what not to do yet

---

## Now

Time horizon:

- immediate
- current cycle
- next meaningful shipping window

Theme:

**make the current product solid, coherent, and operationally usable**

### Goals

- finish the property editing foundation
- make the plugin and admin workflow reliable
- reduce setup ambiguity
- establish a strong agency-editor workflow

### Major initiatives

#### 1. Write-capable PWB properties plugin

Build the next iteration described in
[docs/pwb-properties-plugin-write-capable.md](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/docs/pwb-properties-plugin-write-capable.md).

Minimum scope:

- authenticated settings for PWB URL and API auth
- explicit route layer for property read/write operations
- first editable property form for core fields
- validation and save feedback
- conflict handling
- strong logging

Why this matters:

- property editing is the largest missing piece in the “one back office” story
- it validates the hybrid model instead of fighting it

#### 2. Connection diagnostics

Add a diagnostics surface for all critical external dependencies.

At minimum:

- PWB connection status
- plugin auth status
- current configured base URL
- last successful request
- clear failure messages

Why this matters:

- reduces debugging time
- reduces support burden
- turns setup from guesswork into a product feature

#### 3. Save reliability and editor UX

Improve the quality of all write actions.

At minimum:

- clear field errors
- top-level failure messages
- dirty state indicator
- success toast
- “last saved” or “saved successfully” feedback
- unsaved changes warnings

Why this matters:

- unreliable editing ruins trust faster than missing features

#### 4. Role boundaries

Define who can do what.

At minimum:

- admins can configure plugin settings
- admins can edit listings
- later, editors may edit listings without settings access

Why this matters:

- prevents accidental operational misuse
- makes the product feel mature

#### 5. Better local/dev ergonomics

Document and improve:

- plugin reload behavior
- required restarts for workspace plugin changes
- logging
- troubleshooting flows

Why this matters:

- speeds up iteration
- reduces false debugging paths

### Success criteria for Now

You should consider the `Now` phase successful when:

- an admin can reliably edit a core set of listing fields from EmDash
- setup issues are diagnosable without reading code
- save flows are understandable and trustworthy
- logs are good enough to trace failures quickly
- the admin experience feels intentionally designed, not experimental

### What not to do yet

Do not prioritize:

- media upload CRUD
- AI-assisted content
- bulk listing actions
- multi-tenant abstractions
- advanced CRM integrations

Those are valuable, but they do not solve the biggest immediate usability gap.

---

## Next

Time horizon:

- after write-capable editing is stable
- after core admin reliability is proven

Theme:

**turn the system into a growth tool for agencies, not just an admin shell**

### Goals

- improve website merchandising
- improve SEO leverage
- improve lead handling
- increase business impact per site

### Major initiatives

#### 1. Homepage and listing merchandising

Add tools for editors to control how inventory is presented.

Examples:

- featured listings
- manual ordering of promoted properties
- curated “Luxury”, “Recently Added”, or “Featured Rentals” sections
- reusable listing-query widgets

Why this matters:

- agencies care about what gets promoted
- it directly affects engagement and lead generation

#### 2. Area and search landing pages

Build a system for high-value landing pages.

Examples:

- “Properties for sale in Marbella”
- “4-bedroom villas in Malaga”
- “Beachfront rentals in X”

These should combine:

- live PWB listing queries
- editable EmDash content sections
- strong metadata and internal linking

Why this matters:

- this is one of the clearest SEO and conversion opportunities
- it uses the hybrid architecture well

#### 3. SEO and structured data improvements

Expand the site’s ability to rank and render correctly in search.

Examples:

- stronger property structured data
- area-page schema
- better canonical handling
- metadata templates
- internal linking automation
- listing-to-content and content-to-listing associations

Why this matters:

- agencies do not just need a website; they need discoverability

#### 4. Enquiry and lead routing

Improve lead handling from the admin and integration layer.

Examples:

- route enquiries to email/webhooks/CRM
- tag lead source by page/listing
- show which property generated each enquiry
- allow agency-specific webhook rules

Why this matters:

- lead capture is a primary business outcome
- better attribution makes the system more valuable

#### 5. Listing quality tooling

Help agencies improve listing quality instead of only storing data.

Examples:

- listing completeness score
- missing-photo warnings
- thin-description warnings
- missing location or pricing warnings
- “recommended improvements” panel

Why this matters:

- quality control is high leverage
- it improves both SEO and conversion

### Success criteria for Next

You should consider the `Next` phase successful when:

- agencies can actively curate and promote inventory without code changes
- the platform can produce meaningful landing pages for SEO and campaigns
- leads can be attributed and routed clearly
- editors get useful quality feedback rather than only forms

### What not to do too early in Next

Do not let these derail the phase:

- overly generic page-builder complexity
- full media DAM ambitions
- broad marketplace/plugin generalization
- deep analytics before basic attribution is useful

Stay focused on growth outcomes.

---

## Later

Time horizon:

- once core operations and growth tooling are stable

Theme:

**differentiate the product and reduce operational cost at scale**

### Goals

- create meaningful product differentiation
- reduce setup and support effort
- support more agencies or more complex teams

### Major initiatives

#### 1. AI-assisted operations

Examples:

- draft or rewrite listing descriptions
- summarize local area benefits
- suggest missing metadata
- generate blog/article drafts from listing or market data
- create SEO page outlines from listing segments

Why later:

- AI works best after the editing workflow is already strong
- otherwise it generates more noise than value

#### 2. Bulk operations

Examples:

- bulk status updates
- bulk metadata fixes
- bulk assign featured categories
- bulk validation checks

Why later:

- bulk tools are powerful, but dangerous without strong models and permissions

#### 3. Media workflows

Examples:

- upload listing galleries
- reorder images
- designate cover images
- attach floor plans or PDFs

Why later:

- media CRUD is a distinct complexity layer
- it should not block the first write-capable listing workflow

#### 4. Team workflows and approvals

Examples:

- approval states
- change review
- editorial activity feed
- save history or audit trail

Why later:

- useful for more mature customers
- not required to validate the core single-agency editing model

#### 5. Onboarding and imports

Examples:

- first-run setup wizard
- import from CSV
- import from legacy real estate CMS exports
- guided PWB connection setup

Why later:

- very valuable once the core product is proven
- especially helpful if this becomes a repeatable product offering

#### 6. Multi-tenant platformization

Examples:

- repeatable agency provisioning
- branded themes and preset packages
- agency-level feature flags
- safer per-customer settings isolation

Why later:

- this should follow product clarity, not precede it
- otherwise you risk building platform infrastructure around an unproven workflow

### Success criteria for Later

You should consider the `Later` phase successful when:

- the system can scale operationally across more customers or teams
- advanced features feel like leverage, not entropy
- onboarding/support costs trend downward

---

## Recommended Sequencing

The recommended order of execution is:

1. write-capable property editing
2. plugin settings/auth/test-connection
3. save reliability, conflict handling, and role controls
4. homepage/listing merchandising
5. area landing pages and SEO tooling
6. enquiry attribution and routing
7. listing quality scoring
8. AI, media workflows, and bulk operations
9. onboarding/import and platformization

This sequence matters because each stage builds on trust established in the previous one.

---

## Priority Filter

When choosing between roadmap items, prioritize work that does one or more of the following:

### Saves staff time

Examples:

- fewer systems to use
- fewer manual handoffs
- less repeated data entry

### Improves conversion

Examples:

- better listing presentation
- better homepage curation
- better lead routing

### Improves SEO reach

Examples:

- better structured data
- better landing pages
- stronger internal linking

### Reduces support burden

Examples:

- diagnostics
- test-connection tools
- better setup flows
- more visible errors

### Strengthens product differentiation

Examples:

- unified listing + CMS workflow
- agency-appropriate admin UX
- merchandising and SEO tools built around real-estate use cases

If a feature does not score well on at least one of these, it should probably not be near
the top of the roadmap.

---

## What To Avoid

The product will get worse if it drifts into any of these patterns:

### 1. Dual truth for listings

Do not let both EmDash and PWB become editable canonical stores for property data.

### 2. Generic CMS feature sprawl

Do not become “a CMS that also kind of does properties.”

The value comes from real-estate-specific workflows.

### 3. Premature platform engineering

Do not optimize for ten customers before the workflow is excellent for one.

### 4. AI-before-workflow

Do not paper over weak UX with AI features.

If the admin is confusing, AI will only accelerate bad outcomes.

### 5. Overbuilding media and bulk systems too early

These are worthwhile later, but they are not the highest leverage next step.

---

## Suggested Working Theme

If the team needs one sentence to align around for the next period, use:

**Build one back office for agency staff.**

That theme is concrete enough to guide prioritization.

When evaluating new ideas, ask:

- does this reduce context switching?
- does this improve editor confidence?
- does this help agencies market and sell better?
- does this fit the PWB + EmDash split cleanly?

If the answer is no, it is probably not a near-term roadmap item.

---

## Short Version

### Now

- make listing editing reliable
- improve diagnostics and save UX
- establish strong editor workflows

### Next

- improve merchandising, SEO pages, and lead handling
- build agency growth tooling

### Later

- add AI, bulk tools, media workflows, onboarding, and scale features

The product gets better by becoming more coherent and more useful to agency staff, not by
becoming broader for its own sake.
