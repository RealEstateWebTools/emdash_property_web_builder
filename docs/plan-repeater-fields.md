# Plan: Repeater Field Type

## What It Is

The `repeater` field type (added in EmDash 0.2.0) allows structured, ordered lists of sub-fields
within a single content entry. Unlike Portable Text, a repeater produces a typed array that's easy
to query and render without a block renderer.

> **Sub-fields go in `validation.subFields`, not `fields`.** The admin renders a repeater's rows
> from `validation.subFields`. A seed that uses `fields` passes `emdash seed --validate` and seeds
> without error, but every row is an empty box in the admin. `src/seed-schema.test.ts` guards the
> seed files. Sub-field types: string, text, url, number, integer, boolean, datetime, select, image.

## Current Collections

| Collection   | Candidate for Repeater |
|--------------|----------------------|
| `posts`      | Key takeaways, FAQ section |
| `pages`      | Homepage feature highlights, FAQ, testimonial picks |
| `team`       | Social links (name + url pairs) |
| `testimonials` | Highlight quotes (if multi-quote per testimonial ever needed) |

Properties live in the PWB backend — repeater fields cannot be added there via seed.json.

## Proposed Additions

### 1. Team — Social Links

Replace the single `string` fields for social profiles with a typed repeater:

```json
{
  "slug": "social_links",
  "label": "Social Links",
  "type": "repeater",
  "validation": {
    "subFields": [
      { "slug": "platform", "label": "Platform", "type": "string" },
      { "slug": "url",      "label": "URL",      "type": "string" }
    ]
  }
}
```

Renders as a row of icon links on the team member page/card.

### 2. Pages — FAQ Section

Add structured FAQs to any page (homepage, about, area guides):

```json
{
  "slug": "faqs",
  "label": "FAQs",
  "type": "repeater",
  "validation": {
    "subFields": [
      { "slug": "question", "label": "Question", "type": "string" },
      { "slug": "answer",   "label": "Answer",   "type": "text"   }
    ]
  }
}
```

Renders as an accordion. Can also be output as `FAQPage` JSON-LD schema for SEO.

### 3. Posts — Key Takeaways

Structured summary bullets for blog posts, rendered above the body or in a sidebar:

```json
{
  "slug": "key_takeaways",
  "label": "Key Takeaways",
  "type": "repeater",
  "validation": {
    "subFields": [
      { "slug": "point", "label": "Point", "type": "string" }
    ]
  }
}
```

## Implementation Steps

1. Add repeater fields to `seed/seed.json` under the relevant collections
2. Run `pnpm seed:schema` — `pnpm seed` skips fields that already exist, so changed field
   definitions only reach an existing database this way
3. Restart `pnpm dev` so it regenerates `emdash-env.d.ts`
4. Update Astro page templates to render the new fields:
   - `src/pages/[lang]/posts/[slug].astro` — key takeaways
   - Team member partials — social links
   - Page templates — FAQs accordion
5. Add demo content entries via seed or admin UI to verify rendering

## Rendering Pattern

```astro
---
// entry.data.faqs is typed as Array<{ question: string; answer: string }>
const { faqs } = entry.data
---
{faqs?.map(faq => (
  <details>
    <summary>{faq.question}</summary>
    <p>{faq.answer}</p>
  </details>
))}
```

## Risks

- Seed migrations are additive — adding a repeater field is safe; removing one requires a manual
  migration to avoid data loss
- Don't add repeater fields speculatively; start with team social links (lowest risk, clearest
  value) and validate the pattern before expanding
