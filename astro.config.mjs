import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { fileURLToPath } from "node:url";
import { d1, r2, sandbox } from "@emdash-cms/cloudflare";
import { formsPlugin } from "@emdash-cms/plugin-forms";
import { webhookNotifierPlugin } from "@emdash-cms/plugin-webhook-notifier";
import { defineConfig, sessionDrivers } from "astro/config";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";
import { pwbPropertyEmbedsPlugin } from "pwb-property-embeds";
import { pwbPropertiesPlugin } from "pwb-properties";
import { pwbValuationPlugin } from "pwb-valuation";
import { pwbValuationIntegration } from "pwb-valuation/integration";

const isDev = process.env.NODE_ENV !== "production";
const nativeSsrExcludes = ["better-sqlite3", "bindings", "file-uri-to-path"];
const emdashLocalExcludes = [
	"emdash/db/sqlite",
	"emdash/storage/local",
	"emdash/media/local-runtime",
];

export default defineConfig({
	output: "server",
	// Cloudflare adapter is production-only. In dev, Astro runs as plain Node.
	// The adapter provides session storage in production; for dev we supply our own.
	adapter: isDev ? undefined : cloudflare(),
	// fs-lite keeps sessions on disk between restarts. The Cloudflare adapter
	// provides its own session storage in production so this block is dev-only.
	// In-memory sessions for dev (lost on server restart, but no external deps needed).
	// The Cloudflare adapter provides persistent session storage in production.
	...(isDev ? { session: { driver: sessionDrivers.memory() } } : {}),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		pwbValuationIntegration({
			layout: "./src/layouts/BaseLayout.astro",
			pwbClientModule: "./src/lib/pwb/client.js",
		}),
		emdash({
			// Local dev: SQLite (seeded with `npx emdash seed`)
			// Production: Cloudflare D1 + R2
			database: isDev
				? sqlite({ url: "file:./data.db" })
				: d1({ binding: "DB", session: "auto" }),
			storage: isDev
				? local({ directory: "./uploads", baseUrl: "/_emdash/api/media/file" })
				: r2({ binding: "MEDIA" }),
			mcp: true,
			plugins: isDev
				? [formsPlugin(), webhookNotifierPlugin(), pwbPropertiesPlugin(), pwbPropertyEmbedsPlugin(), pwbValuationPlugin()]
				: [formsPlugin(), pwbPropertyEmbedsPlugin(), pwbValuationPlugin()],
			sandboxed: isDev ? [] : [webhookNotifierPlugin(), pwbPropertiesPlugin()],
			sandboxRunner: isDev ? undefined : sandbox(),
			marketplace: isDev ? undefined : "https://marketplace.emdashcms.com",
		}),
	],
	devToolbar: { enabled: false },
	vite: {
		resolve: {
			// Ensure a single React instance across the page and the admin UI.
			dedupe: ["react", "react-dom"],
			alias: {
				// use-sync-external-store ships a CJS shim that Vite can't serve as ESM
				// when its importer (emdash) is excluded from optimizeDeps. React 19
				// exports useSyncExternalStore natively, so we redirect to that instead.
				"use-sync-external-store/shim/index.js": fileURLToPath(new URL("./src/shims/use-sync-external-store-shim.js", import.meta.url)),
				"use-sync-external-store/shim/with-selector.js": fileURLToPath(
					new URL("./src/shims/use-sync-external-store-with-selector-shim.js", import.meta.url),
				),
			},
		},
		ssr: {
			// Prevent Vite from trying to bundle native Node modules or local-only
			// emdash modules during SSR — they must stay as require() calls.
			optimizeDeps: {
				exclude: [...nativeSsrExcludes, ...emdashLocalExcludes],
			},
		},
		optimizeDeps: {
			include: [
				"@astrojs/react/client.js",
				"react",
				"react-dom",
				"react-dom/client",
				"react/jsx-runtime",
				"react/jsx-dev-runtime",
			],
			exclude: [
				// Must not be pre-bundled: pnpm has no direct symlink for it, and
				// bundling it would inline a second copy of React → invalid hook errors.
				"@emdash-cms/admin",
				"emdash",
				"emdash/astro",
				...emdashLocalExcludes,
				...nativeSsrExcludes,
				"emdash/middleware",
				"emdash/middleware/redirect",
				"emdash/middleware/setup",
				"emdash/middleware/auth",
				"emdash/middleware/request-context",
				"emdash/media/local-runtime",
				"@emdash-cms/cloudflare",
				"@emdash-cms/cloudflare/db/d1",
				"@emdash-cms/cloudflare/storage/r2",
				"@emdash-cms/plugin-forms",
				"@emdash-cms/plugin-webhook-notifier",
				"pwb-property-embeds",
				"pwb-properties",
				"pwb-valuation",
				"pwb-valuation/integration",
			],
		},
	},
});
