# EmDash Migration: Implementing PWB Page Parts

This document outlines the architecture and implementation path to successfully port all original PropertyWebBuilder (PWB) Liquid `page_parts` natively into your EmDash ecosystem. 

In EmDash, instead of static Liquid drops or sections, we use **Portable Text Blocks**. This allows editors to use the `/` menu in the content editor to dynamically insert, reorder, and configure rich page sections like Heroes, Testimonials, and Features exactly where they want them.

## 🏗 Architecture Analysis

The original PWB contains several component abstractions inside `app/views/pwb/page_parts/`. To bring these into EmDash properly, we will build a **Native EmDash Plugin**. 

| PWB Liquid Part | EmDash Portable Text Block Type | Purpose |
| ------------- | ------------------ | ----------- |
| `heroes/` | `pwb-hero` | Hero images with integrated property search |
| `cta/` | `pwb-cta` | Distinct call-to-action banners |
| `features/` | `pwb-features` | Icon-driven service overviews (e.g. Sales, Lettings) |
| `galleries/` | `pwb-gallery` | Image grids for properties or office tours |
| `teams/` | `pwb-team` | Staff directories |
| `testimonials/` | `pwb-testimonials` | Social proof carousels |
| `faqs/` | `pwb-faq` | Expandable accordion sections |

---

## 🛠 Step 1: Scaffold the Plugin

We begin by scaffolding a Native plugin named `plugin-pwb-page-parts`. Native plugins are required because we rely on Astro component SSR injection for the site frontend.

Create the package in your workspace: `packages/plugin-pwb-page-parts`

### Package Setup (`package.json`)
```json
{
  "name": "@my-org/plugin-pwb-page-parts",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./sandbox": "./src/sandbox-entry.ts",
    "./astro": "./src/astro/index.ts"
  },
  "peerDependencies": {
    "emdash": "workspace:*"
  }
}
```

---

## 🛠 Step 2: Define the Descriptor

The descriptor is executed by Vite during the build step. It registers the existence of our frontend components.

**`src/index.ts`**
```typescript
import type { PluginDescriptor } from 'emdash';

export function pwbPagePartsPlugin(options = {}): PluginDescriptor {
  return {
    id: 'pwb-page-parts',
    version: '1.0.0',
    format: 'native', 
    entrypoint: '@my-org/plugin-pwb-page-parts/sandbox',
    componentsEntry: '@my-org/plugin-pwb-page-parts/astro', // Required for PT Blocks
    options,
  };
}
```

---

## 🛠 Step 3: Define Block Schema & UI (Block Kit)

Now we instruct EmDash on how the CMS interface should look when an admin configures a page part. We do this inside `sandbox-entry.ts`.

**`src/sandbox-entry.ts`**
```typescript
import { definePlugin } from 'emdash';

export default definePlugin({
  id: 'pwb-page-parts',
  version: '1.0.0',

  admin: {
    portableTextBlocks: [
      // 1. Hero Search Block
      {
        type: 'pwb-hero',
        label: 'PWB Hero with Search',
        icon: 'image',
        description: 'A full-width hero header containing the property search form.',
        fields: [
          { type: 'text_input', action_id: 'title', label: 'Main Headline' },
          { type: 'text_input', action_id: 'subtitle', label: 'Subtitle' },
          { type: 'text_input', action_id: 'bgImage', label: 'Background Image URL' }
        ]
      },
      
      // 2. Testimonials Block
      {
        type: 'pwb-testimonials',
        label: 'Testimonials Carousel',
        icon: 'users',
        description: 'Displays a carousel of client reviews.',
        fields: [
          { type: 'text_input', action_id: 'heading', label: 'Section Heading' },
          { type: 'number_input', action_id: 'count', label: 'How many to show?' }
        ]
      },

      // 3. CTA Banner
      {
        type: 'pwb-cta',
        label: 'Call to Action Banner',
        icon: 'bell',
        fields: [
          { type: 'text_input', action_id: 'title', label: 'Heading' },
          { type: 'text_input', action_id: 'text', label: 'Subtext' },
          { type: 'text_input', action_id: 'btnText', label: 'Button Text' },
          { type: 'text_input', action_id: 'btnLink', label: 'Button Link' }
        ]
      }
    ]
  }
});
```

---

## 🛠 Step 4: Map EmDash Blocks to Astro Components

To make sure these blocks cleanly render on the frontend, we define EmDash `componentsEntry` which links the `type` keys to `.astro` view implementation.

**`src/astro/index.ts`**
```typescript
import HeroBlock from './HeroBlock.astro';
import TestimonialsBlock from './TestimonialsBlock.astro';
import CtaBlock from './CtaBlock.astro';

// This export name is required by EmDash
export const blockComponents = {
  'pwb-hero': HeroBlock,
  'pwb-testimonials': TestimonialsBlock,
  'pwb-cta': CtaBlock
};
```

---

## 🛠 Step 5: Implement the Astro Components

Now we port the actual CSS and HTML from the original PWB into Astro `.astro` components. 

**Example: `src/astro/CtaBlock.astro`**
```astro
---
// The block instance data is passed inside Astro.props.node
const { title, text, btnText, btnLink } = Astro.props.node;
---
<section class="cta-banner">
  <div class="cta-banner__inner">
    <div class="cta-banner__text">
      <h2>{title || 'Ready to talk?'}</h2>
      {text && <p>{text}</p>}
    </div>
    <div class="cta-banner__actions">
      <a href={btnLink || '/contact'} class="btn btn-cta-primary">
        {btnText || 'Contact Us'}
      </a>
    </div>
  </div>
</section>

<style>
/* Add the CTA styles we built earlier here */
</style>
```

---

## 🛠 Step 6: Registration & Usage

1. Open `astro.config.mjs`.
2. Import and register your native plugin in the standard plugin array:

```javascript
import { pwbPagePartsPlugin } from '@my-org/plugin-pwb-page-parts';

export default defineConfig({
  integrations: [
    emdash({
      plugins: [
        pwbPagePartsPlugin()
      ]
    })
  ]
});
```

Once running, editors can go into EmDash -> Pages -> Homepage. When they type `/` in the Portable Text editor block, they will see options for `PWB Hero with Search`, `Call to Action Banner`, and `Testimonials Carousel`. 

Upon saving, Astro will dynamically invoke `CtaBlock.astro` with the user-defined JSON whenever it parses that Portable Text block!

## 🚀 Recommended Phasing Plan
- **Phase 1**: Scaffold Plugin and migrate layout boundaries (Hero, CTA, Features).
- **Phase 2**: Migrate dynamic parts (Testimonials, Teams) that may need to query other EmDash collections from `Astro.props`.
- **Phase 3**: Migrate Forms (General Enquiry, Valuations) utilizing the EmDash form storage APIs.
