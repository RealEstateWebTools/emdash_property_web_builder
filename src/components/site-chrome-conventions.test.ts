import { readFileSync } from "fs";
import { expect, test, describe } from "vitest";

const header = readFileSync("src/components/SiteHeader.astro", "utf-8");
const footer = readFileSync("src/components/SiteFooter.astro", "utf-8");
const indexPage = readFileSync("src/components/pages/IndexPage.astro", "utf-8");

describe("SiteHeader.astro conventions", () => {
  test("nav link color references a CSS variable (no hardcoded hex in color rule)", () => {
    // Extract style block content
    const styleMatch = header.match(/<style>([\s\S]*?)<\/style>/);
    const styles = styleMatch ? styleMatch[1] : "";
    // Nav link color declarations must use var(--...) not bare hex/rgb
    const navLinkColorLines = styles
      .split("\n")
      .filter((l) => l.includes(".site-header__nav a") || l.includes("color:"))
      .join("\n");
    // There should be no `color: #` or `color: rgb(` outside of a var()
    expect(navLinkColorLines).not.toMatch(/color:\s*#[0-9a-fA-F]/);
    expect(navLinkColorLines).not.toMatch(/color:\s*rgb\(/);
  });

  test("nav gap uses CSS variable tokens (no bare rem/px gap values in nav)", () => {
    const styleMatch = header.match(/<style>([\s\S]*?)<\/style>/);
    const styles = styleMatch ? styleMatch[1] : "";
    // Find the .site-header__nav rule block
    const navBlock = styles.match(/\.site-header__nav\s*\{([^}]*)\}/);
    const navBlockStr = navBlock ? navBlock[1] : "";
    // gap must use a var(), not a literal value
    if (navBlockStr.includes("gap")) {
      expect(navBlockStr).toMatch(/gap:\s*var\(--/);
    }
  });

  test("actions gap uses CSS variable tokens (no bare rem/px gap values in actions)", () => {
    const styleMatch = header.match(/<style>([\s\S]*?)<\/style>/);
    const styles = styleMatch ? styleMatch[1] : "";
    const actionsBlock = styles.match(/\.site-header__actions\s*\{([^}]*)\}/);
    const actionsBlockStr = actionsBlock ? actionsBlock[1] : "";
    if (actionsBlockStr.includes("gap")) {
      expect(actionsBlockStr).toMatch(/gap:\s*var\(--/);
    }
  });

  test("mobile menu button has aria-expanded attribute", () => {
    expect(header).toMatch(/aria-expanded=/);
  });

  test("mobile menu button has aria-controls attribute", () => {
    expect(header).toMatch(/aria-controls=/);
  });
});

describe("SiteFooter.astro conventions", () => {
  test("footer link colors use CSS variables (no hardcoded hex)", () => {
    const styleMatch = footer.match(/<style>([\s\S]*?)<\/style>/);
    const styles = styleMatch ? styleMatch[1] : "";
    const colorLines = styles
      .split("\n")
      .filter((l) => l.includes("color:"))
      .join("\n");
    expect(colorLines).not.toMatch(/color:\s*#[0-9a-fA-F]/);
    expect(colorLines).not.toMatch(/color:\s*rgb\(/);
  });

  test("footer margin-top uses --space-section-* token (not bare rem)", () => {
    const styleMatch = footer.match(/<style>([\s\S]*?)<\/style>/);
    const styles = styleMatch ? styleMatch[1] : "";
    const footerBlock = styles.match(/\.site-footer\s*\{([^}]*)\}/);
    const footerStyles = footerBlock ? footerBlock[1] : "";
    if (footerStyles.includes("margin-top")) {
      expect(footerStyles).toMatch(/margin-top:\s*var\(--space-section-/);
    }
  });
});

describe("IndexPage.astro section spacing conventions (U5 scope)", () => {
  test("featured-section padding uses --space-section-* token", () => {
    const styleMatch = indexPage.match(/<style>([\s\S]*?)<\/style>/);
    const styles = styleMatch ? styleMatch[1] : "";
    const block = styles.match(/\.featured-section\s*\{([^}]*)\}/);
    const blockStyles = block ? block[1] : "";
    if (blockStyles.includes("padding")) {
      expect(blockStyles).toMatch(/padding.*var\(--space-section-/);
    }
  });

  test("cta-banner padding uses --space-section-* token", () => {
    const styleMatch = indexPage.match(/<style>([\s\S]*?)<\/style>/);
    const styles = styleMatch ? styleMatch[1] : "";
    const block = styles.match(/\.cta-banner\s*\{([^}]*)\}/);
    const blockStyles = block ? block[1] : "";
    if (blockStyles.includes("padding")) {
      expect(blockStyles).toMatch(/padding.*var\(--space-section-/);
    }
  });
});
