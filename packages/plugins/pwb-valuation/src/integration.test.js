import { describe, expect, it } from "vitest";
import { prefixedLocales, valuationVirtualModules } from "./integration.js";

describe("prefixedLocales", () => {
  it("lists non-default locale prefixes, so /es/valuation is injected", () => {
    expect(prefixedLocales({ defaultLocale: "en", locales: ["en", "es", "fr"], routing: { prefixDefaultLocale: false } }))
      .toEqual(["es", "fr"]);
  });

  it("includes the default locale when it is prefixed, and granular locale paths", () => {
    expect(prefixedLocales({
      defaultLocale: "en",
      locales: ["en", { path: "espanol", codes: ["es"] }],
      routing: { prefixDefaultLocale: true },
    })).toEqual(["en", "espanol"]);
  });

  it("is empty without i18n", () => {
    expect(prefixedLocales(undefined)).toEqual([]);
  });
});

const paths = {
  layoutPath: "/site/src/layouts/BaseLayout.astro",
  pwbClientPath: "/site/src/lib/pwb/client.js",
  serializedConfig: JSON.stringify({ basePath: "" }),
};

function load(plugin, id) {
  const resolved = plugin.resolveId(id);
  expect(resolved).toBe(`\0${id}`);
  return plugin.load(resolved);
}

describe("valuationVirtualModules site-details module", () => {
  // /valuation used to call createPwbClient() directly, which throws on sites
  // without PWB_API_URL. The host's loader falls back to EmDash settings.
  it("re-exports the host's loadSiteDetails when siteDetailsModule is set", () => {
    const plugin = valuationVirtualModules({ ...paths, siteDetailsPath: "/site/src/lib/site-details.ts" });
    const code = load(plugin, "virtual:pwb-valuation/site-details");
    expect(code).toBe('export { loadSiteDetails } from "/site/src/lib/site-details.ts";');
    expect(code).not.toContain("createPwbClient");
  });

  it("falls back to the PWB client when no siteDetailsModule is given", () => {
    const plugin = valuationVirtualModules({ ...paths, siteDetailsPath: null });
    const code = load(plugin, "virtual:pwb-valuation/site-details");
    expect(code).toContain('import { createPwbClient } from "/site/src/lib/pwb/client.js";');
    expect(code).toContain("export function loadSiteDetails(locale)");
  });

  it("leaves unrelated module ids alone", () => {
    const plugin = valuationVirtualModules({ ...paths, siteDetailsPath: null });
    expect(plugin.resolveId("virtual:other")).toBeUndefined();
  });
});
