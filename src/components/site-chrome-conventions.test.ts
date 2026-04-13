import { readFileSync } from "fs";
import { expect, test, describe } from "vitest";

const header = readFileSync("src/components/SiteHeader.astro", "utf-8");

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
