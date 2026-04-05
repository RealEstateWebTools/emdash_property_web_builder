import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2, sandbox } from "@emdash-cms/cloudflare";
import { formsPlugin } from "@emdash-cms/plugin-forms";
import { webhookNotifierPlugin } from "@emdash-cms/plugin-webhook-notifier";
import { defineConfig } from "astro/config";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";

const isDev = process.env.NODE_ENV !== "production";
const nativeSsrExcludes = ["better-sqlite3", "bindings", "file-uri-to-path"];
const emdashLocalExcludes = [
	"emdash/db/sqlite",
	"emdash/storage/local",
	"emdash/media/local-runtime",
];

export default defineConfig({
	output: "server",
	adapter: isDev ? undefined : cloudflare(),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			// Local dev: SQLite (seeded with `npx emdash seed`)
			// Production: Cloudflare D1 + R2
			database: isDev
				? sqlite({ url: "file:./data.db" })
				: d1({ binding: "DB", session: "auto" }),
			storage: isDev
				? local({ directory: "./uploads", baseUrl: "/_emdash/api/media/file" })
				: r2({ binding: "MEDIA" }),
			plugins: isDev ? [formsPlugin(), webhookNotifierPlugin()] : [formsPlugin()],
			sandboxed: isDev ? [] : [webhookNotifierPlugin()],
			sandboxRunner: isDev ? undefined : sandbox(),
			marketplace: isDev ? undefined : "https://marketplace.emdashcms.com",
		}),
	],
	devToolbar: { enabled: false },
	vite: {
		resolve: {
			dedupe: ["react", "react-dom"],
		},
		ssr: {
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
			],
		},
	},
});
