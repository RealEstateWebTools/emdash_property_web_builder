import { definePlugin } from "emdash";

export const PORTABLE_TEXT_BLOCKS = [
  {
    type: "pwb-hero",
    label: "PWB Hero",
    icon: "image",
    description: "Hero section with optional primary and secondary calls to action.",
    fields: [
      { type: "text_input", action_id: "title", label: "Main headline" },
      { type: "text_input", action_id: "subtitle", label: "Subtitle" },
      { type: "text_input", action_id: "backgroundImageUrl", label: "Background image URL" },
      { type: "text_input", action_id: "primaryLabel", label: "Primary button label" },
      { type: "text_input", action_id: "primaryHref", label: "Primary button link" },
      { type: "text_input", action_id: "secondaryLabel", label: "Secondary button label" },
      { type: "text_input", action_id: "secondaryHref", label: "Secondary button link" },
      {
        type: "select",
        action_id: "overlay",
        label: "Overlay",
        options: [
          { label: "Light", value: "light" },
          { label: "Dark", value: "dark" },
        ],
        initial_value: "dark",
      },
    ],
  },
  {
    type: "pwb-cta",
    label: "PWB CTA Banner",
    icon: "bell",
    description: "Call to action banner with headline, copy, and one button.",
    fields: [
      { type: "text_input", action_id: "title", label: "Heading" },
      { type: "text_input", action_id: "text", label: "Body text" },
      { type: "text_input", action_id: "buttonLabel", label: "Button label" },
      { type: "text_input", action_id: "buttonHref", label: "Button link" },
    ],
  },
  {
    type: "pwb-features",
    label: "PWB Features",
    icon: "layout-grid",
    description: "Three-card feature row for core services.",
    fields: [
      { type: "text_input", action_id: "heading", label: "Section heading" },
      { type: "text_input", action_id: "item1Title", label: "Feature 1 title" },
      { type: "text_input", action_id: "item1Body", label: "Feature 1 body" },
      { type: "text_input", action_id: "item2Title", label: "Feature 2 title" },
      { type: "text_input", action_id: "item2Body", label: "Feature 2 body" },
      { type: "text_input", action_id: "item3Title", label: "Feature 3 title" },
      { type: "text_input", action_id: "item3Body", label: "Feature 3 body" },
    ],
  },
  {
    type: "pwb-stats",
    label: "PWB Trust Stats",
    icon: "chart-column",
    description: "Four-up metrics block for trust, traction, or recent performance.",
    fields: [
      { type: "text_input", action_id: "heading", label: "Section heading" },
      { type: "text_input", action_id: "intro", label: "Intro text" },
      { type: "text_input", action_id: "item1Value", label: "Stat 1 value" },
      { type: "text_input", action_id: "item1Label", label: "Stat 1 label" },
      { type: "text_input", action_id: "item2Value", label: "Stat 2 value" },
      { type: "text_input", action_id: "item2Label", label: "Stat 2 label" },
      { type: "text_input", action_id: "item3Value", label: "Stat 3 value" },
      { type: "text_input", action_id: "item3Label", label: "Stat 3 label" },
      { type: "text_input", action_id: "item4Value", label: "Stat 4 value" },
      { type: "text_input", action_id: "item4Label", label: "Stat 4 label" },
    ],
  },
  {
    type: "pwb-testimonials",
    label: "PWB Testimonials",
    icon: "message-square",
    description: "Three testimonial cards for trust-building quotes and client roles.",
    fields: [
      { type: "text_input", action_id: "eyebrow", label: "Eyebrow" },
      { type: "text_input", action_id: "heading", label: "Heading" },
      { type: "text_input", action_id: "intro", label: "Intro text" },
      { type: "text_input", action_id: "quote1", label: "Quote 1" },
      { type: "text_input", action_id: "name1", label: "Name 1" },
      { type: "text_input", action_id: "role1", label: "Role 1" },
      { type: "text_input", action_id: "quote2", label: "Quote 2" },
      { type: "text_input", action_id: "name2", label: "Name 2" },
      { type: "text_input", action_id: "role2", label: "Role 2" },
      { type: "text_input", action_id: "quote3", label: "Quote 3" },
      { type: "text_input", action_id: "name3", label: "Name 3" },
      { type: "text_input", action_id: "role3", label: "Role 3" },
    ],
  },
  {
    type: "pwb-local-expertise",
    label: "PWB Local Expertise",
    icon: "map-pinned",
    description: "Office credibility block with local coverage, specialism, and a contact call to action.",
    fields: [
      { type: "text_input", action_id: "eyebrow", label: "Eyebrow" },
      { type: "text_input", action_id: "heading", label: "Heading" },
      { type: "text_input", action_id: "body", label: "Body text" },
      { type: "text_input", action_id: "point1Label", label: "Point 1 label" },
      { type: "text_input", action_id: "point1Value", label: "Point 1 value" },
      { type: "text_input", action_id: "point2Label", label: "Point 2 label" },
      { type: "text_input", action_id: "point2Value", label: "Point 2 value" },
      { type: "text_input", action_id: "point3Label", label: "Point 3 label" },
      { type: "text_input", action_id: "point3Value", label: "Point 3 value" },
      { type: "text_input", action_id: "buttonLabel", label: "Button label" },
      { type: "text_input", action_id: "buttonHref", label: "Button link" },
    ],
  },
  {
    type: "pwb-valuation-cta",
    label: "PWB Valuation CTA",
    icon: "calculator",
    description: "Valuation request call to action — links to the /valuation page.",
    fields: [
      { type: "text_input", action_id: "eyebrow", label: "Eyebrow (optional)" },
      { type: "text_input", action_id: "heading", label: "Heading" },
      { type: "text_input", action_id: "body", label: "Body text" },
      { type: "text_input", action_id: "buttonLabel", label: "Button label" },
      { type: "text_input", action_id: "valuationHref", label: "Valuation page URL (default: /valuation)" },
    ],
  },
];

export function pwbPagePartsPlugin() {
  return {
    id: "pwb-page-parts",
    version: "0.1.0",
    format: "native",
    entrypoint: "pwb-page-parts",
    componentsEntry: "pwb-page-parts/astro",
    options: {},
  };
}

export function createPlugin() {
  return definePlugin({
    id: "pwb-page-parts",
    version: "0.1.0",
    admin: {
      portableTextBlocks: PORTABLE_TEXT_BLOCKS,
    },
  });
}

export default createPlugin;
