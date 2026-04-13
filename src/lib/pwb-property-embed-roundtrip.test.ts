import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
	pluginBlockAttrsToPortableTextBlock,
	portableTextPluginBlockToAttrs,
} from "../../node_modules/emdash/src/components/plugin-block-attrs.ts";
import { createPlugin } from "../../packages/plugins/pwb-property-embeds/src/index.js";

describe("EmDash plugin block attr roundtrip", () => {
	it("preserves arbitrary plugin block attrs through PM conversion helpers", () => {
		const block = {
			_type: "propertyEmbed",
			_key: "embed123",
			slug: "beautiful-villa-marbella",
			variant: "compact",
			ctaLabel: "View Property",
			showMeta: true,
		};

		const attrs = portableTextPluginBlockToAttrs(block);

		expect(attrs).toEqual({
			blockType: "propertyEmbed",
			blockKey: "embed123",
			slug: "beautiful-villa-marbella",
			variant: "compact",
			ctaLabel: "View Property",
			showMeta: true,
		});

		const roundtrip = pluginBlockAttrsToPortableTextBlock(attrs, () => "generated-key");

		expect(roundtrip).toEqual(block);
	});

	it("falls back to a generated key when blockKey is missing", () => {
		const roundtrip = pluginBlockAttrsToPortableTextBlock(
			{
				blockType: "propertyEmbed",
				slug: "beautiful-villa-marbella",
				variant: "inline",
			},
			() => "generated-key",
		);

		expect(roundtrip).toEqual({
			_type: "propertyEmbed",
			_key: "generated-key",
			slug: "beautiful-villa-marbella",
			variant: "inline",
		});
	});

	it("preserves legacy id-based blocks for backward compatibility", () => {
		const block = {
			_type: "propertyEmbed",
			_key: "legacy123",
			id: "beautiful-villa-marbella",
		};

		const attrs = portableTextPluginBlockToAttrs(block);

		expect(attrs).toEqual({
			blockType: "propertyEmbed",
			blockKey: "legacy123",
			id: "beautiful-villa-marbella",
		});

		expect(pluginBlockAttrsToPortableTextBlock(attrs, () => "generated-key")).toEqual(block);
	});
});

describe("PWB property embed plugin config", () => {
	it("registers rich block fields for slug, variant, and CTA label", () => {
		const plugin = createPlugin();
		const block = plugin.admin?.portableTextBlocks?.find((item) => item.type === "propertyEmbed");

		expect(block).toBeTruthy();
		expect(block?.fields).toEqual([
			{
				type: "text_input",
				action_id: "slug",
				label: "Property Slug or URL",
				placeholder: "beautiful-villa-marbella or /properties/beautiful-villa-marbella",
			},
			{
				type: "select",
				action_id: "suggestedSlug",
				label: "Quick Pick",
				options: [],
				optionsRoute: "properties/list",
			},
			{
				type: "select",
				action_id: "variant",
				label: "Display Variant",
				options: [
					{ label: "Card", value: "card" },
					{ label: "Compact", value: "compact" },
					{ label: "Inline", value: "inline" },
				],
				initial_value: "card",
			},
			{
				type: "text_input",
				action_id: "ctaLabel",
				label: "CTA Label",
				placeholder: "Optional override for the button text",
			},
		]);
	});

	it("registers a property shortlist route for admin quick-picks", async () => {
		process.env.PWB_API_URL = "https://example.com";
		const originalFetch = global.fetch;
		global.fetch = async () =>
			({
				ok: true,
				json: async () => ({
					data: [{ slug: "villa-marbella", title: "Villa Marbella", formatted_price: null, reference: null }],
				}),
			}) as Response;

		try {
			const plugin = createPlugin();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const result = await plugin.routes?.["properties/list"]?.handler({} as any);
			expect(result).toEqual({ items: [{ id: "villa-marbella", name: "Villa Marbella" }] });
		} finally {
			global.fetch = originalFetch;
		}
	});
});

describe("EmDash patch workflow", () => {
	it("wires the local emdash patch through pnpm patchedDependencies", () => {
		const packageJsonPath = resolve(process.cwd(), "package.json");
		const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

		expect(packageJson.pnpm?.patchedDependencies).toEqual({
			"emdash@0.2.0": "patches/emdash@0.2.0.patch",
		});
	});

	it("tracks the editor fix in the patch file", () => {
		const patchPath = resolve(process.cwd(), "patches/emdash@0.2.0.patch");
		const patch = readFileSync(patchPath, "utf8");

		expect(patch).toContain("src/components/InlinePortableTextEditor.tsx");
		expect(patch).toContain("src/components/plugin-block-attrs.ts");
		expect(patch).toContain("portableTextPluginBlockToAttrs");
		expect(patch).toContain("pluginBlockAttrsToPortableTextBlock");
	});

	it("tracks the locale-aware RecentPosts widget fix in the patch file", () => {
		const patchPath = resolve(process.cwd(), "patches/emdash@0.2.0.patch");
		const patch = readFileSync(patchPath, "utf8");

		expect(patch).toContain("src/components/widgets/RecentPosts.astro");
		expect(patch).toContain('locale: currentLocale');
		expect(patch).toContain('getPostHref(post.id)');
	});
});
