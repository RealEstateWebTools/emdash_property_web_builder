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

/**
 * @param {object} options
 * @param {string} [options.layout]         Path to the host layout component, relative to project root.
 * @param {string} [options.pwbClientModule] Path to the PWB client module, relative to project root.
 * @param {string} [options.basePath]       URL prefix for all injected routes (default: '').
 */
export function pwbValuationIntegration(options = {}) {
  const {
    layout = "./src/layouts/BaseLayout.astro",
    pwbClientModule = "./src/lib/pwb/client.js",
    basePath = "",
  } = options;

  return {
    name: "pwb-valuation",
    hooks: {
      "astro:config:setup": ({ injectRoute, config: astroConfig, updateConfig }) => {
        const projectRoot = fileURLToPath(astroConfig.root);
        const layoutPath = resolve(projectRoot, layout);
        const pwbClientPath = resolve(projectRoot, pwbClientModule);
        const serializedConfig = JSON.stringify({ basePath });

        // Inject the /valuation frontend page.
        // Astro resolves this entrypoint via the package.json "exports" map.
        injectRoute({
          pattern: `${basePath}/valuation`,
          entrypoint: "pwb-valuation/pages/valuation",
        });

        // Vite plugin that resolves virtual module imports inside the injected pages.
        updateConfig({
          vite: {
            plugins: [
              {
                name: "pwb-valuation-virtual",
                resolveId(id) {
                  if (id === VIRTUAL_LAYOUT) return "\0" + VIRTUAL_LAYOUT;
                  if (id === VIRTUAL_PWB_CLIENT) return "\0" + VIRTUAL_PWB_CLIENT;
                  if (id === VIRTUAL_CONFIG) return "\0" + VIRTUAL_CONFIG;
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
                  // Serialized integration options
                  if (id === "\0" + VIRTUAL_CONFIG) {
                    return `export const config = ${serializedConfig};`;
                  }
                },
              },
            ],
          },
        });
      },
    },
  };
}
