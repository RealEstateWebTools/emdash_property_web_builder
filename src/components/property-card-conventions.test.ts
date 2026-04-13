import { readFileSync } from "fs";
import { expect, test, describe } from "vitest";

const card = readFileSync("src/components/PropertyCard.astro", "utf-8");

const styleMatch = card.match(/<style>([\s\S]*?)<\/style>/);
const styles = styleMatch ? styleMatch[1] : "";
const template = card.replace(/<style>[\s\S]*?<\/style>/, "");

describe("PropertyCard.astro visual conventions", () => {
  test("badge uses --shadow-* token (no bare box-shadow on badge)", () => {
    const badgeBlock = styles.match(/\.property-card__badge\s*\{([^}]*)\}/);
    const badgeStyles = badgeBlock ? badgeBlock[1] : "";

    if (badgeStyles.includes("box-shadow")) {
      expect(badgeStyles).toMatch(/box-shadow:\s*var\(--shadow-/);
    }
  });

  test("badge color uses CSS variable (no hardcoded hex on badge)", () => {
    const badgeBlock = styles.match(/\.property-card__badge\s*\{([^}]*)\}/);
    const badgeStyles = badgeBlock ? badgeBlock[1] : "";

    expect(badgeStyles).not.toMatch(/color:\s*#[0-9a-fA-F]/);
  });

  test("meta row gap uses CSS variable token (no bare rem/px in meta gap)", () => {
    const metaBlock = styles.match(/\.property-card__meta\s*\{([^}]*)\}/);
    const metaStyles = metaBlock ? metaBlock[1] : "";

    if (metaStyles.includes("gap")) {
      expect(metaStyles).toMatch(/gap:\s*var\(--/);
    }
  });

  test("meta item gap uses CSS variable token (no bare rem/px in meta li gap)", () => {
    const metaLiBlock = styles.match(/\.property-card__meta\s+li\s*\{([^}]*)\}/);
    const metaLiStyles = metaLiBlock ? metaLiBlock[1] : "";

    if (metaLiStyles.includes("gap")) {
      expect(metaLiStyles).toMatch(/gap:\s*var\(--/);
    }
  });

  test("card has distinct price element", () => {
    expect(template).toMatch(/property-card__price/);
  });

  test("card has distinct title heading element", () => {
    expect(template).toMatch(/property-card__title/);
  });

  test("card has distinct meta list element", () => {
    expect(template).toMatch(/property-card__meta/);
  });
});
