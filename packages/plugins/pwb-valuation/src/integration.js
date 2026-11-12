/**
 * Astro integration for pwb-valuation.
 *
 * This is the route-injection half of the plugin. It uses Astro's
 * `injectRoute` API to add /valuation to the site without the site
 * author creating any files in src/pages/.
 *
 * A Vite plugin resolves virtual modules so the injected page can
 * import from the host site without relative path gymnastics:
 *   - virtual:pwb-valuation/layout    → host site's layout component
 *   - virtual:pwb-valuation/pwb-client → host site's PWB client module
 *   - virtual:pwb-valuation/site-details → loadSiteDetails(locale) for the page chrome
 *   - virtual:pwb-valuation/config    → integration options (basePath etc.)
 *
 * Register in astro.config.mjs:
 *
 *   import { pwbValuationIntegration } from 'pwb-valuation/integration';
 *
 *   export default defineConfig({
 *     integrations: [
 *       pwbValuationIntegration({
 *         layout: './src/layouts/BaseLayout.astro',
 *         pwbClientModule: './src/lib/pwb/client.js',
 *         // Optional: a module exporting loadSiteDetails(locale) that works
 *         // without PWB. Without it, site details come from the PWB client.
 *         siteDetailsModule: './src/lib/site-details.ts',
 *       }),
 *       // ... other integrations
 *     ],
 *   });
 */

import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const VIRTUAL_LAYOUT = "virtual:pwb-valuation/layout";
const VIRTUAL_PWB_CLIENT = "virtual:pwb-valuation/pwb-client";
const VIRTUAL_CONFIG = "virtual:pwb-valuation/config";
const VIRTUAL_SITE_DETAILS = "virtual:pwb-valuation/site-details";

/**
 * @param {object} options
 * @param {string} [options.layout]         Path to the host layout component, relative to project root.
 * @param {string} [options.pwbClientModule] Path to the PWB client module, relative to project root.
 * @param {string} [options.siteDetailsModule] Path to a module exporting `loadSiteDetails(locale)`,
 *                                          relative to project root. Defaults to the PWB client's
 *                                          getSiteDetails(), which requires PWB.
 * @param {string} [options.clientIpHeader] Header the page uses to pass the visitor's address
 *                                          to the submit route it calls in-process. Must be in
 *                                          EmDash's `trustedProxyHeaders`; without it the route
 *                                          can't throttle per visitor.
 * @param {string} [options.basePath]       URL prefix for all injected routes (default: '').
 */
export function pwbValuationIntegration(options = {}) {
  const {
    layout = "./src/layouts/BaseLayout.astro",
    pwbClientModule = "./src/lib/pwb/client.js",
    siteDetailsModule,
    clientIpHeader,
    basePath = "",
  } = options;

  return {
    name: "pwb-valuation",
    hooks: {
      "astro:config:setup": ({ injectRoute, config: astroConfig, updateConfig }) => {
        const projectRoot = fileURLToPath(astroConfig.root);
        const layoutPath = resolve(projectRoot, layout);
        const pwbClientPath = resolve(projectRoot, pwbClientModule);
        const siteDetailsPath = siteDetailsModule ? resolve(projectRoot, siteDetailsModule) : null;
        const localePrefixes = prefixedLocales(astroConfig.i18n);
        const serializedConfig = JSON.stringify({ basePath, localePrefixes, clientIpHeader: clientIpHeader ?? null });

        // Inject the /valuation frontend page.
        // Astro resolves this entrypoint via the package.json "exports" map.
        injectRoute({
          pattern: `${basePath}/valuation`,
          entrypoint: "pwb-valuation/pages/valuation",
        });
        // Localized copies (/es/valuation, …): sites link to them, and no
        // i18n fallback redirect is assumed to send visitors to /valuation.
        if (localePrefixes.length > 0) {
          injectRoute({
            pattern: `${basePath}/[lang]/valuation`,
            entrypoint: "pwb-valuation/pages/valuation",
          });
        }

        // Vite plugin that resolves virtual module imports inside the injected pages.
        updateConfig({
          vite: {
            plugins: [valuationVirtualModules({ layoutPath, pwbClientPath, siteDetailsPath, serializedConfig })],
          },
        });
      },
    },
  };
}

/**
 * URL prefixes of the site's locales (`es`, `fr`), from Astro's i18n config.
 * The default locale has no prefix unless routing.prefixDefaultLocale is set.
 * Exported for tests.
 */
export function prefixedLocales(i18n) {
  if (!i18n?.locales) return [];
  const prefixDefault = i18n.routing?.prefixDefaultLocale === true;
  return i18n.locales
    .map((locale) => (typeof locale === "string" ? locale : locale.path))
    .filter((path) => typeof path === "string" && path && (prefixDefault || path !== i18n.defaultLocale));
}

/**
 * Vite plugin that resolves the virtual modules imported by the injected page.
 * Exported for tests.
 */
export function valuationVirtualModules({ layoutPath, pwbClientPath, siteDetailsPath, serializedConfig }) {
  const ids = [VIRTUAL_LAYOUT, VIRTUAL_PWB_CLIENT, VIRTUAL_SITE_DETAILS, VIRTUAL_CONFIG];
  return {
    name: "pwb-valuation-virtual",
    resolveId(id) {
      if (ids.includes(id)) return "\0" + id;
    },
    load(id) {
      // Re-export the host site's layout as the default export
      if (id === "\0" + VIRTUAL_LAYOUT) {
        return `export { default } from ${JSON.stringify(layoutPath)};`;
      }
      // Re-export the host site's PWB client exports
      if (id === "\0" + VIRTUAL_PWB_CLIENT) {
        return `export * from ${JSON.stringify(pwbClientPath)};`;
      }
      // The host's loadSiteDetails, or one built on the PWB client
      if (id === "\0" + VIRTUAL_SITE_DETAILS) {
        if (siteDetailsPath) return `export { loadSiteDetails } from ${JSON.stringify(siteDetailsPath)};`;
        return [
          `import { createPwbClient } from ${JSON.stringify(pwbClientPath)};`,
          "export function loadSiteDetails(locale) { return createPwbClient(locale).getSiteDetails(); }",
        ].join("\n");
      }
      // Serialized integration options
      if (id === "\0" + VIRTUAL_CONFIG) {
        return `export const config = ${serializedConfig};`;
      }
    },
  };
}
