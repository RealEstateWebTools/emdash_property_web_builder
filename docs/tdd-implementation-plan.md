# TDD Implementation Plan

Generated: 2026-04-13

This document is an execution guide for the next round of improvements in
`emdash_property_web_builder`.

It is written for a junior developer. Follow it in order. Do not skip the
`Red -> Green -> Refactor` cycle. Keep each change set small enough that you can
explain it in one sentence.

This plan assumes the current architecture remains the same:

- PWB is the source of truth for listings, search, and enquiries
- EmDash is the source of truth for editorial content and admin workflows
- Astro composes both systems into the public site

---

## How To Work Through This Plan

For every milestone:

1. Read the goal and scope.
2. Create or extend the tests listed in the `Red` section first.
3. Run only the narrow test target for that milestone.
4. Implement the smallest code change that makes the failing tests pass.
5. Refactor only after the tests are green.
6. Re-run the narrow test target.
7. Re-run the broader safety checks before moving to the next milestone.

Use this standard command sequence:

```bash
pnpm run test:run -- <targeted-test-file>
pnpm run test:run
pnpm run typecheck
```

If you change docs, also run:

```bash
pnpm run test:run -- src/docs-validation.test.ts
```

### Detailed Red -> Green -> Refactor Protocol

Use this exact protocol for every milestone.

#### Step 0: Scope Lock

1. Copy the milestone goal into your scratch notes in one sentence.
2. List only the files mentioned in that milestone.
3. Explicitly defer all out-of-scope ideas to a follow-up list.

If you cannot describe the scope in one sentence, you are about to overbuild.

#### Step 1: Red (Failing Test First)

1. Add or update tests exactly as listed in the milestone `Red` section.
2. Run only the targeted test command for that milestone.
3. Confirm the test fails for the expected reason.
4. Record the failure reason in one short line in your notes.

Rules for this step:

- Never edit production code before you see the failing assertion.
- If the test fails for an unrelated reason, fix the test harness first.
- If the test unexpectedly passes, strengthen the assertion until it fails.

#### Step 2: Green (Minimal Fix)

1. Implement the smallest code change that satisfies the failing test.
2. Run the same targeted test command again.
3. Continue only when the targeted tests are green.

Rules for this step:

- Prefer adapting existing helpers over introducing new abstractions.
- Do not refactor while still red.
- Avoid changing public behavior that is not explicitly covered by the milestone.

#### Step 3: Refactor (Safe Cleanup)

1. Remove duplication introduced during Green.
2. Improve names and extract helpers only when it reduces cognitive load.
3. Re-run the targeted tests after each refactor chunk.

Rules for this step:

- Refactor in tiny increments.
- Keep output behavior identical.
- Stop refactoring as soon as readability is acceptable.

#### Step 4: Safety Gate

Before marking a milestone complete, run:

```bash
pnpm run test:run
pnpm run typecheck
```

If docs changed, also run:

```bash
pnpm run test:run -- src/docs-validation.test.ts
```

Only move to the next milestone when all gates are green.

### Commit Workflow (Per Milestone)

Use one commit per milestone. Do not mix milestones.

1. `git status --short`
2. Stage only files touched by the current milestone.
3. Commit with a milestone-specific message.

Recommended commit message format:

- `Implement Milestone <N> <short-scope>`

Examples:

- `Implement Milestone 1 local enquiry API route`
- `Implement Milestone 2 search cache hint and helper`

### Failure Handling Playbook

When stuck, follow this order:

1. Re-read the failing assertion and expected behavior.
2. Re-run only the single failing test with `pnpm run test:run -- <file>`.
3. Confirm fixture and mock setup is correct.
4. Check for locale-sensitive behavior (`en`, `es`, `fr`).
5. Check for cache behavior when EmDash queries are involved.
6. If still blocked, add a characterization test to lock current behavior.

Do not jump to broad rewrites while debugging a narrow test failure.

### Quality Checklist (Before Opening PR)

1. Every milestone change is test-backed.
2. No commented-out code or dead branches remain.
3. Public URL shapes remain unchanged unless the milestone says otherwise.
4. Localized behavior still works for `en`, `es`, and `fr`.
5. Error responses do not leak internals.
6. All required commands are green.

---

## Working Rules

These are non-negotiable while executing this plan.

- Do not start by editing production code. Start by writing the failing test.
- Do not bundle multiple unrelated improvements into one commit.
- Do not remove existing resilience behavior unless a test proves the new path is safer.
- Do not guess EmDash or Astro APIs. Read the local code before changing usage.
- Keep all content pages server-rendered.
- When an EmDash content query returns `cacheHint`, call `Astro.cache.set(cacheHint)`.
- When working on localized routes, preserve the current `en`, `es`, and `fr` behavior.

---

## Baseline Before Starting

Run these once before making changes:

```bash
pnpm run test:run
pnpm run typecheck
pnpm run test:run -- src/docs-validation.test.ts
```

Expected result:

- the test suite is green before you begin
- typecheck passes
- docs validation passes

If baseline is red, stop and understand why before continuing.

---

## Milestone 1: Move Enquiries Behind A Local API Route

### Goal

Stop posting enquiries directly from the browser to PWB. Route submissions through
the Astro app first so validation, error handling, and future anti-spam controls
live in one place.

### Why This Matters

Today:

- the browser posts directly to the PWB API
- the public page exposes the PWB base URL to the client
- form behavior is harder to test end-to-end

After this milestone:

- the browser posts to a local Astro API route
- validation happens server-side as well as client-side
- upstream PWB failures are translated into safe, predictable responses

### Files To Read First

- [src/components/ContactForm.astro](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/components/ContactForm.astro)
- [src/lib/pwb/enquiry-validator.ts](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/lib/pwb/enquiry-validator.ts)
- [src/lib/pwb/client.ts](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/lib/pwb/client.ts)
- [src/layouts/BaseLayout.astro](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/layouts/BaseLayout.astro)

### Red

Write tests for a new Astro API route. Suggested file:

- [src/pages/api/enquiries.test.ts](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/pages/api)

Add these failing tests:

1. `POST` with valid payload returns success JSON.
2. `POST` with missing `name`, invalid `email`, or empty `message` returns `400`.
3. Route forwards valid payload to the PWB enquiry endpoint in the correct shape.
4. Upstream PWB validation failure returns a safe client-facing error payload.
5. Upstream network failure returns `502` or `500` with no leaked internals.
6. `ContactForm` no longer requires the `meta[name="pwb-api-url"]` value.

If route-level testing in Astro is awkward, extract the handler logic into a small
helper in `src/lib/pwb/` and test that helper directly.

### Green

Implement:

1. A new local API route, for example:
   - [src/pages/api/enquiries.ts](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/pages/api)
2. Server-side validation using:
   - [src/lib/pwb/enquiry-validator.ts](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/lib/pwb/enquiry-validator.ts)
3. Upstream forwarding using:
   - [src/lib/pwb/client.ts](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/lib/pwb/client.ts)
4. A client-side form refactor so:
   - [`fetch()`] posts to `/api/enquiries`
   - status messages come from the local API response
5. Removal of the exposed PWB meta tag from:
   - [src/layouts/BaseLayout.astro](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/layouts/BaseLayout.astro)

### Refactor

After tests are green:

1. Extract response mapping into a helper if both the route and form need to know
   the same shape.
2. Remove duplicate error strings where possible.
3. Keep the route thin. Business rules should live in a helper if they grow.

### Exit Criteria

- browser no longer needs direct PWB API configuration for enquiries
- form still shows field-level errors
- success and failure states are test-covered
- no regression in current enquiry validation behavior

### Test Commands

```bash
pnpm run test:run -- src/lib/pwb/enquiry-validator.test.ts
pnpm run test:run -- src/pages/api/enquiries.test.ts
pnpm run test:run
pnpm run typecheck
```

---

## Milestone 2: Fix Search Page Scalability And Cache Behavior

### Goal

Make blog search more efficient and ensure it follows EmDash cache rules.

### Why This Matters

Today the search page loads all posts and filters in memory. That is acceptable for
tiny datasets but it will degrade as content grows. It also does not currently show
an explicit `Astro.cache.set(cacheHint)` call on the page query path.

### Files To Read First

- [src/components/pages/SearchPage.astro](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/components/pages/SearchPage.astro)
- [src/lib/search/post-search.ts](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/lib/search/post-search.ts)
- [src/components/pages/PostsIndexPage.astro](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/components/pages/PostsIndexPage.astro)

### Red

Add or extend tests here:

- [src/lib/search/post-search.test.ts](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/lib/search/post-search.test.ts)

Add these failing tests:

1. Empty query returns no results.
2. Title match returns a result.
3. Excerpt match returns a result.
4. Portable Text body match returns a result.
5. Search results can be limited.
6. Search result summaries still work for `en`, `es`, and `fr`.

Also add a test or characterization check for the page behavior:

1. The search page applies `Astro.cache.set(cacheHint)` when it performs an EmDash
   content query.

### Green

Implement the smallest safe improvement:

1. Keep search logic in a helper under `src/lib/search/`.
2. Refactor the page so it uses the helper rather than embedding search logic inline.
3. Ensure `cacheHint` from the EmDash query is passed to `Astro.cache.set(cacheHint)`.
4. If you cannot replace the full collection query yet, at least:
   - make the page explicit about the cache hint
   - cap the result count
   - keep the query helper pure and tested

Do not invent an external search system in this milestone. The objective is to make
the existing path safer and more scalable, not to redesign search infrastructure.

### Refactor

1. Keep search string processing in pure functions.
2. Keep the page focused on input/output only.
3. Use descriptive helper names such as `searchPosts()` or `filterPostsByQuery()`.

### Exit Criteria

- search behavior is covered by tests
- cache hint is explicitly applied
- page logic is slimmer than before
- no change in public URL shape (`/search?q=...`)

### Test Commands

```bash
pnpm run test:run -- src/lib/search/post-search.test.ts
pnpm run test:run
pnpm run typecheck
```

---

## Milestone 3: Fix Property Search Filter State

### Goal

Make the property search UI preserve the selected filter state correctly and use the
existing search data more effectively.

### Why This Matters

Today price filters are rendered without preserving the selected values. The page also
passes `facets` into the search bar but does not currently use them.

### Files To Read First

- [src/components/SearchBar.astro](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/components/SearchBar.astro)
- [src/components/pages/PropertyIndexPage.astro](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/components/pages/PropertyIndexPage.astro)
- [src/lib/pwb/search-params.ts](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/lib/pwb/search-params.ts)
- [src/lib/pwb/search-params.test.ts](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/lib/pwb/search-params.test.ts)

### Red

Extend tests in:

- [src/lib/pwb/search-params.test.ts](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/lib/pwb/search-params.test.ts)

Add failing tests for:

1. `price_from` round-trips correctly for sale mode.
2. `price_to` round-trips correctly for sale mode.
3. `price_from` round-trips correctly for rental mode.
4. `price_to` round-trips correctly for rental mode.
5. `sort` is preserved.
6. `page` is preserved only when explicitly needed.

If possible, also add rendering tests for `SearchBar`:

1. selected property type is shown
2. selected bedrooms are shown
3. selected min price is shown
4. selected max price is shown
5. selected sort option is shown

### Green

Implement:

1. Selected-state support for price filters in:
   - [src/components/SearchBar.astro](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/components/SearchBar.astro)
2. Any missing URL mapping fixes in:
   - [src/lib/pwb/search-params.ts](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/lib/pwb/search-params.ts)
3. Optional facet usage if you can do it without broad UI redesign:
   - show counts
   - hide impossible options
   - improve empty-state feedback

Keep scope tight. This milestone is about correctness, not a full search redesign.

### Refactor

1. Centralize all query-string mapping in one file.
2. Avoid repeated `URLSearchParams` manipulation in page components.
3. Keep `SearchBar.astro` mostly declarative.

### Exit Criteria

- search filters preserve state after submit
- query-string behavior is covered by tests
- no regression in page loading or pagination

### Test Commands

```bash
pnpm run test:run -- src/lib/pwb/search-params.test.ts
pnpm run test:run
pnpm run typecheck
```

---

## Milestone 4: Harden Localization Coverage

### Goal

Reduce localized UI drift by adding missing translation coverage and a test to catch
future gaps.

### Why This Matters

The route structure is localized, but some user-facing UI strings still fall back to
English because not every key used in components exists in the locale tables.

### Files To Read First

- [src/lib/locale.ts](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/lib/locale.ts)
- [src/components/SiteHeader.astro](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/components/SiteHeader.astro)
- [src/components/SiteFooter.astro](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/components/SiteFooter.astro)
- [src/components/PropertyCard.astro](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/components/PropertyCard.astro)
- [src/components/ContactForm.astro](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/components/ContactForm.astro)

### Red

Create a test file such as:

- [src/lib/locale.test.ts](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/lib/locale.test.ts)

Add failing tests for:

1. required UI keys exist in `es`
2. required UI keys exist in `fr`
3. locale path generation still behaves correctly
4. non-default locale validation still rejects invalid locale strings

Required keys should include at minimum:

- `Properties`
- `Posts`
- `Bathrooms`
- `Area`
- `Contact Us`
- `Send Enquiry`
- `Your enquiry has been sent!`
- `Something went wrong. Please try again.`
- `Network error. Please try again.`

If the code still uses hard-coded strings instead of translation keys, the test
should fail until those strings are moved into the translation table.

### Green

Implement:

1. missing translation keys in:
   - [src/lib/locale.ts](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/lib/locale.ts)
2. component updates so user-facing strings use `translateLabel()`
3. any brand-related strings through `translateBrand()` where appropriate

### Refactor

1. Group related translation keys together.
2. Keep labels and brand translations separate.
3. Add a short comment above any non-obvious key grouping.

### Exit Criteria

- no major public UI strings are hard-coded in English where localized output is expected
- tests fail clearly if a required translation key is removed later

### Test Commands

```bash
pnpm run test:run -- src/lib/locale.test.ts
pnpm run test:run
pnpm run typecheck
```

---

## Milestone 5: Simplify Localized Route Wrappers

### Goal

Reduce duplicated route wrapper logic while preserving current route behavior.

### Why This Matters

The app currently uses parallel root and `[lang]` route wrappers. The pattern works,
but the duplication increases maintenance cost and makes localization changes easy to
miss.

### Files To Read First

- [src/pages/index.astro](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/pages/index.astro)
- [src/pages/[lang]/index.astro](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/pages/[lang]/index.astro)
- [src/pages/pages/[slug].astro](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/pages/pages/[slug].astro)
- [src/pages/[lang]/pages/[slug].astro](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/pages/[lang]/pages/[slug].astro)
- [src/localized-route-conventions.test.ts](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/localized-route-conventions.test.ts)
- [src/page-conventions.test.ts](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/page-conventions.test.ts)

### Red

Add characterization tests before refactoring:

1. invalid locale prefix returns `404`
2. valid non-default locale renders the same page component as the root route pattern
3. slug routes still forward the correct `locale` and `slug` props
4. root routes still resolve the default locale correctly

Prefer extending the existing route convention test files rather than introducing a
third overlapping convention file.

### Green

Implement the smallest refactor that reduces duplication without changing public
behavior. Options include:

1. a shared helper for locale validation and prop construction
2. a small wrapper component for common route bootstrapping
3. consistent route file structure and comments

Do not try to redesign Astro routing itself. The objective is less duplication and
clearer conventions, not a clever abstraction.

### Refactor

1. keep route files thin
2. keep locale validation logic centralized
3. remove duplicated `404` handling patterns where a helper makes them clearer

### Exit Criteria

- fewer repeated route bootstrapping patterns
- route convention tests remain green
- no change to current localized URL structure

### Test Commands

```bash
pnpm run test:run -- src/localized-route-conventions.test.ts
pnpm run test:run -- src/page-conventions.test.ts
pnpm run test:run
pnpm run typecheck
```

---

## Milestone 6: Improve Map Reliability And Frontend Accessibility

### Goal

Reduce runtime fragility in the property map and improve accessibility in the mobile
navigation and enquiry form.

### Why This Matters

The current map loads Leaflet from a public CDN at runtime. The mobile header also
has room for stronger accessible state handling, and the contact form currently uses
fixed field IDs that can become invalid if multiple forms appear on one page.

### Files To Read First

- [src/components/MapView.astro](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/components/MapView.astro)
- [src/components/SiteHeader.astro](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/components/SiteHeader.astro)
- [src/components/ContactForm.astro](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/src/components/ContactForm.astro)

### Red

Add tests for:

1. map does not render when there are no markers
2. marker popup content is safely escaped
3. mobile nav toggle updates `aria-expanded`
4. nav toggle references a stable `aria-controls` target
5. enquiry form field IDs are unique per form instance

If component-level testing is difficult in Astro, extract the non-trivial logic into
helpers and test those helpers directly.

### Green

Implement:

1. bundle or locally manage Leaflet instead of relying on runtime CDN injection
2. escape popup content before rendering marker HTML
3. improve the mobile nav button semantics
4. generate unique IDs for contact form fields based on `formId`

Do not expand scope into a full visual redesign.

### Refactor

1. move map bootstrap code into a small client helper if it becomes bulky
2. keep `MapView.astro` as mostly markup and configuration
3. use shared helpers for generating form field IDs if needed

### Exit Criteria

- map behavior is less dependent on third-party runtime availability
- popup content is safer
- nav toggle state is clearer to assistive technology
- form markup remains valid if multiple forms render on the same page

### Test Commands

```bash
pnpm run test:run
pnpm run typecheck
```

---

## Recommended Delivery Order

Do the milestones in this order:

1. Milestone 1: local enquiry API route
2. Milestone 2: search page cache and scalability
3. Milestone 3: property search filter state
4. Milestone 4: localization coverage
5. Milestone 5: route wrapper simplification
6. Milestone 6: map reliability and accessibility

This order is deliberate:

- first remove the most brittle public runtime dependency
- then fix data/query correctness
- then improve UX correctness
- then harden maintainability and accessibility

---

## Definition Of Done For The Whole Plan

The work is complete when all of the following are true:

- enquiries flow through a local Astro endpoint
- blog search is test-covered and applies EmDash cache hints correctly
- property search filters preserve state correctly
- required localized UI strings are test-covered
- route duplication is reduced without breaking localized URLs
- map and form accessibility improvements are in place
- the full test suite passes
- `pnpm run typecheck` passes
- `pnpm run test:run -- src/docs-validation.test.ts` passes if this doc or any other docs changed

---

## Final Safety Check Before Merging

Run:

```bash
pnpm run test:run
pnpm run typecheck
pnpm run test:run -- src/docs-validation.test.ts
```

Then manually verify:

1. property search still works on `/properties`
2. enquiry form still submits successfully
3. localized routes still work for `/es/...` and `/fr/...`
4. search page still works for `/search?q=...`
5. property detail pages still render map and enquiry sections correctly

If any manual check fails, do not merge even if tests are green.
