import { describe, expect, it } from "vitest";
import createPlugin, { PORTABLE_TEXT_BLOCKS, pwbPagePartsPlugin } from "./index.js";

describe("pwb-page-parts descriptor", () => {
  it("returns a native plugin descriptor with astro mapping entry", () => {
    const descriptor = pwbPagePartsPlugin();

    expect(descriptor.id).toBe("pwb-page-parts");
    expect(descriptor.format).toBe("native");
    expect(descriptor.componentsEntry).toBe("pwb-page-parts/astro");
  });
});

describe("pwb-page-parts schema", () => {
  it("declares hero, cta, and features portable text blocks", () => {
    const types = PORTABLE_TEXT_BLOCKS.map((block) => block.type).sort();
    expect(types).toEqual(["pwb-cta", "pwb-features", "pwb-hero"]);
  });

  it("uses Block Kit field elements and stable action ids", () => {
    for (const block of PORTABLE_TEXT_BLOCKS) {
      expect(Array.isArray(block.fields)).toBe(true);
      expect(block.fields.length).toBeGreaterThan(0);

      for (const field of block.fields) {
        expect(typeof field.type).toBe("string");
        expect(field.type).toMatch(/^(text_input|number_input|select|toggle)$/);
        expect(typeof field.action_id).toBe("string");
        expect(field.action_id.length).toBeGreaterThan(0);
      }
    }
  });

  it("exposes blocks through definePlugin admin config", () => {
    const runtime = createPlugin();
    expect(runtime.admin.portableTextBlocks).toHaveLength(3);
  });
});
