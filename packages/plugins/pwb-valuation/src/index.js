/**
 * EmDash plugin descriptor for pwb-valuation.
 *
 * Register this in astro.config.mjs under emdash({ plugins: [] }).
 * Also register pwbValuationIntegration() in the integrations array
 * so that the frontend /valuation page is injected.
 */
export function pwbValuationPlugin() {
  return {
    id: "pwb-valuation",
    version: "0.1.0",
    format: "standard",
    entrypoint: "pwb-valuation/sandbox",
    options: {},
    capabilities: [],
    storage: {
      valuations: {
        indexes: ["email", "status", "createdAt"],
      },
    },
    adminPages: [{ path: "/", label: "Valuation Requests", icon: "list" }],
  };
}
