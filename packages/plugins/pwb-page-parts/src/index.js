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
