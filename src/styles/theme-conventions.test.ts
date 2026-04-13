import { readFileSync } from "fs";
import { expect, test, describe } from "vitest";

const css = readFileSync("src/styles/theme.css", "utf-8");

describe("theme.css token conventions", () => {
  describe("font tokens", () => {
    test("defines --font-body token", () => {
      expect(css).toMatch(/--font-body\s*:/);
    });

    test("defines --font-heading token", () => {
      expect(css).toMatch(/--font-heading\s*:/);
    });
  });

  describe("radius tokens", () => {
    test("defines --radius-sm token", () => {
      expect(css).toMatch(/--radius-sm\s*:/);
    });

    test("defines --radius-md token", () => {
      expect(css).toMatch(/--radius-md\s*:/);
    });

    test("defines --radius-lg token", () => {
      expect(css).toMatch(/--radius-lg\s*:/);
    });
  });

  describe("shadow tokens", () => {
    test("defines --shadow-sm token", () => {
      expect(css).toMatch(/--shadow-sm\s*:/);
    });

    test("defines --shadow-md token", () => {
      expect(css).toMatch(/--shadow-md\s*:/);
    });

    test("defines --shadow-lg token", () => {
      expect(css).toMatch(/--shadow-lg\s*:/);
    });
  });

  describe("section spacing tokens", () => {
    test("defines --space-section-sm token", () => {
      expect(css).toMatch(/--space-section-sm\s*:/);
    });

    test("defines --space-section-md token", () => {
      expect(css).toMatch(/--space-section-md\s*:/);
    });

    test("defines --space-section-lg token", () => {
      expect(css).toMatch(/--space-section-lg\s*:/);
    });
  });
});
