import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("pwb-page-parts blockComponents", () => {
  it("maps all declared types to Astro renderers", () => {
    const source = readFileSync(resolve(process.cwd(), "packages/plugins/pwb-page-parts/src/astro/index.js"), "utf-8");

    expect(source).toContain('"pwb-hero": PwbHeroBlock');
    expect(source).toContain('"pwb-cta": PwbCtaBlock');
    expect(source).toContain('"pwb-features": PwbFeaturesBlock');
    expect(source).toContain('"pwb-stats": PwbStatsBlock');
    expect(source).toContain('"pwb-testimonials": PwbTestimonialsBlock');
    expect(source).toContain('"pwb-local-expertise": PwbLocalExpertiseBlock');
  });
});
