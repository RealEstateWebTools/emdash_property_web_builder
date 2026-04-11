import { describe, expect, it } from "vitest";
import { defaultFeatures, normalizeLocale, t } from "./i18n.js";

describe("pwb-page-parts i18n", () => {
  it("normalizes unsupported locales to en", () => {
    expect(normalizeLocale("fr")).toBe("en");
    expect(normalizeLocale(undefined)).toBe("en");
  });

  it("returns localized copy when available", () => {
    expect(t("es", "heroPrimaryCta")).toBe("Ver propiedades");
  });

  it("falls back to en for missing locale keys", () => {
    expect(t("fr", "ctaButton")).toBe("Contact Us");
  });

  it("returns three default features for every supported locale", () => {
    expect(defaultFeatures("en")).toHaveLength(3);
    expect(defaultFeatures("es")).toHaveLength(3);
  });
});
