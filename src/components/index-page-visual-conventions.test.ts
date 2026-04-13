import { readFileSync } from "fs";
import { expect, test, describe } from "vitest";

const page = readFileSync("src/components/pages/IndexPage.astro", "utf-8");

// Split into template and style sections
const styleMatch = page.match(/<style>([\s\S]*?)<\/style>/);
const styles = styleMatch ? styleMatch[1] : "";

// Template: everything between the closing --- frontmatter and <style>
const templateMatch = page.match(/---\n([\s\S]*?)---\n([\s\S]*?)<style>/);
const template = templateMatch ? templateMatch[2] : page;

describe("IndexPage.astro hero visual conventions", () => {
  test("hero section has exactly one overlay element", () => {
    // Count occurrences of overlay class in template markup
    const overlayMatches = template.match(/hero__overlay/g) ?? [];
    expect(overlayMatches.length).toBe(1);
  });

  test("hero search box uses --radius-* tokens", () => {
    // Extract .hero__search and .hero-search-form rules
    const heroSearchBlock = styles.match(/\.hero__search\s*\{([^}]*)\}/);
    const searchFormBlock = styles.match(/\.hero-search-form\s*\{([^}]*)\}/);
    const combined = [
      heroSearchBlock ? heroSearchBlock[1] : "",
      searchFormBlock ? searchFormBlock[1] : "",
    ].join("\n");

    if (combined.includes("border-radius")) {
      expect(combined).toMatch(/border-radius:\s*var\(--radius-/);
    }
  });

  test("hero search box uses --shadow-* token (no bare box-shadow in hero-search-form)", () => {
    const searchFormBlock = styles.match(/\.hero-search-form\s*\{([^}]*)\}/);
    const formStyles = searchFormBlock ? searchFormBlock[1] : "";

    if (formStyles.includes("box-shadow")) {
      expect(formStyles).toMatch(/box-shadow:\s*var\(--shadow-/);
    }
  });

  test("hero has a distinct h1 heading element", () => {
    expect(template).toMatch(/<h1/);
  });

  test("hero has a distinct tagline/subheading element", () => {
    expect(template).toMatch(/hero__tagline/);
  });

  test("hero has a CTA submit element", () => {
    expect(template).toMatch(/type="submit"/);
  });

  test("hero section padding uses --space-section-* token (no bare rem padding)", () => {
    const heroBlock = styles.match(/\.hero\s*\{([^}]*)\}/);
    const heroStyles = heroBlock ? heroBlock[1] : "";

    if (heroStyles.includes("padding")) {
      // Padding must reference a spacing token, not a bare rem/px value as primary vertical padding
      expect(heroStyles).toMatch(/padding.*var\(--space-section-/);
    }
  });
});
