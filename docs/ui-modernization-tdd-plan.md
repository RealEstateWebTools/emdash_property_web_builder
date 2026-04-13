# UI Modernization TDD Plan

Generated: 2026-04-13

This is a dedicated implementation plan for UI and visual polish work.

It is intentionally separate from functional backend and routing milestones.
Use this document when the goal is to improve look-and-feel, visual hierarchy,
and UX consistency to better match the quality bar of
`https://coral-sun-91.propertywebbuilder.com/`.

**Role of the reference site:** Use `coral-sun-91` as a loose visual inspiration
for tone and premium feel — not a pixel-perfect target. Each milestone's exit
criteria (not the reference site) are the authoritative definition of done.

---

## Objective

Make the public site feel cleaner, calmer, and more premium by improving:

- typography consistency
- spacing rhythm and section hierarchy
- card and CTA consistency
- homepage clarity and perceived quality
- navigation and footer visual tone

Do this without changing core architecture:

- PWB remains source of truth for listing data
- EmDash remains source of truth for editorial content
- Astro remains server-rendered

---

## UI Working Rules

1. Keep scope visual unless a UX issue blocks visual clarity.
2. Keep content and route behavior unchanged unless explicitly approved.
3. Prefer token-level changes before component-level overrides.
4. Avoid one-off colors or one-off spacing values in component styles.
5. Maintain responsive behavior at mobile, tablet, and desktop.
6. Validate after every milestone with screenshots or browser checks.

---

## Test Mechanism Convention

All convention tests in this plan are **static source analysis tests** — they
grep or parse source files to assert token usage and structural rules. They do
NOT require a running browser or rendered DOM.

Use Playwright (`npx playwright test`) for the manual QA screenshots listed at
the end of each milestone. Do not mix the two: convention tests run in
`pnpm run test:run`; visual verification runs in Playwright.

Example static test pattern:

```ts
// src/styles/theme-conventions.test.ts
import { readFileSync } from "fs";
import { expect, test } from "vitest";

test("theme.css defines --radius-sm token", () => {
  const css = readFileSync("src/styles/theme.css", "utf-8");
  expect(css).toMatch(/--radius-sm\s*:/);
});
```

---

## Red -> Green -> Refactor (UI Edition)

### Red

1. Add characterization checks first using the **static source analysis**
   pattern above (token presence, class usage in source files).
2. Capture baseline screenshots for home page using Playwright **before** making
   any changes:
   - desktop (1440 width) → save as `docs/screenshots/baseline-desktop.png`
   - mobile (390 width) → save as `docs/screenshots/baseline-mobile.png`
3. Document what currently looks wrong in 3-5 bullets in the milestone section
   of this file before writing any code.

### Green

1. Apply the smallest visual change set that resolves one objective cluster.
2. Re-run targeted checks.
3. Re-open page and confirm no visual regressions in unrelated sections.

### Refactor

1. Move repeated values into tokens.
2. Remove duplicate CSS blocks.
3. Tighten naming and remove stale classes.

---

## Baseline Commands

Run before any UI milestone:

```bash
pnpm run test:run
pnpm run typecheck
pnpm run test:run -- src/docs-validation.test.ts
```

During UI work, use:

```bash
pnpm run test:run -- <targeted-test-file>
pnpm run typecheck
```

---

## Milestone U1: Establish Visual Tokens

### Goal

Create a consistent visual system (typography, spacing, radii, shadows, color)
that all UI components can reuse.

### Files

- `src/styles/theme.css`

### Before You Start

Capture baseline screenshots (Playwright):

- `docs/screenshots/u1-before-desktop.png` (1440px)
- `docs/screenshots/u1-before-mobile.png` (390px)

Document 3-5 current visual problems here before writing code.

### Red

Add/update a **static source analysis** test file:

- `src/styles/theme-conventions.test.ts`

Add failing checks (grep/parse `src/styles/theme.css`) for:

1. single primary font stack variable (`--font-body`, `--font-heading`) present
2. radius tokens defined: `--radius-sm`, `--radius-md`, `--radius-lg`
3. shadow tokens defined: `--shadow-sm`, `--shadow-md`, `--shadow-lg`
4. section spacing tokens defined (e.g., `--space-section-sm`, `--space-section-md`)

### Green

Implement token set in `src/styles/theme.css`.

Target style direction:

- cleaner neutral background
- restrained accent usage
- repeatable card and button tokens

### Refactor

Remove hardcoded values in downstream components that now map to tokens.

### Exit Criteria

- visual tokens are complete and coherent
- no major component relies on arbitrary one-off colors/radii/shadows

---

## Milestone U2: Simplify Header and Navigation

### Goal

Reduce visual noise in nav and create a calmer, more premium top bar.

### Files

- `src/components/SiteHeader.astro`

### Before You Start

Capture baseline screenshots (Playwright):

- `docs/screenshots/u2-before-desktop.png` (1440px)
- `docs/screenshots/u2-before-mobile.png` (390px)

Document 3-5 current visual problems here before writing code.

### Red

Create/update **static source analysis** test file:

- `src/components/site-chrome-conventions.test.ts`

Add failing checks (grep/parse `src/components/SiteHeader.astro`) for:

1. nav links reference a token for default color (no hardcoded hex/rgb)
2. no decorative glow or layered box-shadow classes in nav markup
3. nav spacing uses defined tokens, not arbitrary px/rem values
4. mobile menu element has `aria-expanded` and `aria-controls` attributes

### Green

Refactor header styles:

1. simplify link hover/active treatment
2. unify spacing and typography
3. keep accessibility semantics already implemented

### Refactor

Extract repeated constants/classes if needed.

### Exit Criteria

- desktop nav looks cleaner and less busy
- mobile nav still usable and accessible

---

## Milestone U3: Homepage Hero and Search Clarity

### Goal

Make the hero section feel intentional and easier to scan.

### Files

- `src/components/pages/IndexPage.astro` (hero section only — footer/section
  rhythm is handled in U5; do not touch those areas here)

### Before You Start

Capture baseline screenshots (Playwright):

- `docs/screenshots/u3-before-desktop.png` (1440px)
- `docs/screenshots/u3-before-mobile.png` (390px)

Document 3-5 current visual problems here before writing code.

### Red

Create/update **static source analysis** test file:

- `src/components/index-page-visual-conventions.test.ts`

Add failing checks (grep/parse `src/components/pages/IndexPage.astro`) for:

1. hero section has exactly one overlay element (single backdrop/overlay class)
2. hero search block references `--radius-*` and `--shadow-*` tokens
3. hero has distinct heading, subheading, and CTA elements (role/tag check)
4. hero section uses spacing tokens, not arbitrary px values

### Green

Refactor hero section:

1. simplify overlay and background treatment
2. normalize search form visual language
3. tighten heading and supporting copy rhythm
4. ensure CTA prominence without over-styling

### Refactor

Move reusable hero values into CSS variables/tokens where practical.

### Exit Criteria

- hero feels cleaner and easier to understand
- search controls visually match the rest of the UI

---

## Milestone U4: Card and Grid Consistency

### Goal

Make property cards and listing grids look cohesive and easier to compare.

### Files

- `src/components/PropertyCard.astro`
- `src/components/PropertyGrid.astro`

### Before You Start

Capture baseline screenshots (Playwright):

- `docs/screenshots/u4-before-desktop.png` (1440px)
- `docs/screenshots/u4-before-mobile.png` (390px)

Document 3-5 current visual problems here before writing code.

### Red

Add/update **static source analysis** test file:

- `src/components/property-card-conventions.test.ts`

Add failing checks (grep/parse `PropertyCard.astro` and `PropertyGrid.astro`) for:

1. card uses `--radius-*`, `--shadow-*`, and `--space-*` tokens (no bare px values)
2. meta row elements share a consistent spacing token class
3. badge element has a single, consistent class (no one-off color overrides)
4. heading, price, and meta are in separate, semantically distinct elements

### Green

Refactor card styling and spacing with token usage.

### Refactor

Remove duplicated card-related style snippets across components.

### Exit Criteria

- cards look visually consistent across home and listing pages
- metadata no longer competes with title/price emphasis

---

## Milestone U5: Footer and Section Rhythm

### Goal

Improve lower-page quality by unifying footer and section spacing rhythm.

**Scope note:** This milestone touches `IndexPage.astro` only for section
spacing and the CTA-to-footer transition — not the hero section (U3 owns that).
Coordinate diff review if U3 and U5 land close together to avoid conflicts.

### Files

- `src/components/SiteFooter.astro`
- `src/components/pages/IndexPage.astro` (section spacing and CTA block only)

### Before You Start

Capture baseline screenshots (Playwright):

- `docs/screenshots/u5-before-desktop.png` (1440px)
- `docs/screenshots/u5-before-mobile.png` (390px)

Document 3-5 current visual problems here before writing code.

### Red

Extend **static source analysis** test file:

- `src/components/site-chrome-conventions.test.ts`

Add failing checks (grep/parse `SiteFooter.astro` and `IndexPage.astro`) for:

1. footer links reference a token for color (no hardcoded hex/rgb)
2. section wrappers on index page use `--space-section-*` tokens
3. CTA section and footer share a consistent spacing token at their boundary

### Green

Refactor footer and section spacing:

1. normalize typography scale
2. simplify link visual behavior
3. align spacing between final CTA and footer

### Refactor

Consolidate duplicated spacing declarations.

### Exit Criteria

- footer looks integrated, not visually disconnected
- section transitions feel intentional

---

## Manual QA Checklist (Required)

Each milestone has its own `Before You Start` screenshot step. This checklist
covers the **after** pass once Green is complete.

After each milestone, validate with Playwright (`npx playwright test`):

1. Home page desktop at 1440px → save as `docs/screenshots/uN-after-desktop.png`
2. Home page mobile at 390px → save as `docs/screenshots/uN-after-mobile.png`
3. Properties listing page desktop/mobile
4. Header open/close on mobile
5. CTA and button contrast accessibility (use browser DevTools accessibility checker)

Do not mark a milestone complete until both before and after screenshots exist
in `docs/screenshots/` and show measurable improvement.

---

## Suggested Commit Strategy

Use one commit per UI milestone:

1. `Implement U1 visual token system`
2. `Implement U2 header simplification`
3. `Implement U3 homepage hero clarity`
4. `Implement U4 property card consistency`
5. `Implement U5 footer and rhythm polish`

Do not mix milestone commits.

---

## Definition of Done (UI Track)

UI modernization is complete when:

- visual tokens are cohesive and used consistently
- home page hierarchy is cleaner and easier to scan
- nav, cards, and footer share one visual language
- mobile and desktop remain stable
- test suite and typecheck remain green
- screenshots show measurable visual improvement

---

## Final Validation Commands

```bash
pnpm run test:run
pnpm run typecheck
pnpm run test:run -- src/docs-validation.test.ts
```
