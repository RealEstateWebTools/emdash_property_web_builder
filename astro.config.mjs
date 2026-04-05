import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2, sandbox } from "@emdash-cms/cloudflare";
import { formsPlugin } from "@emdash-cms/plugin-forms";
import { webhookNotifierPlugin } from "@emdash-cms/plugin-webhook-notifier";
import { defineConfig } from "astro/config";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";

const isDev = process.env.NODE_ENV !== "production";

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
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
			plugins: [formsPlugin()],
			sandboxed: [webhookNotifierPlugin()],
			sandboxRunner: sandbox(),
			marketplace: "https://marketplace.emdashcms.com",
		}),
	],
	devToolbar: { enabled: false },
	vite: {
		optimizeDeps: {
			exclude: [
				"emdash",
				"emdash/astro",
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
