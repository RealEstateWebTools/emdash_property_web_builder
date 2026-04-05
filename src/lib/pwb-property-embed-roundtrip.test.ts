import { describe, expect, it } from "vitest";

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
				label: "Property Slug",
				placeholder: "beautiful-villa-marbella",
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
			},
			{
				type: "text_input",
				action_id: "ctaLabel",
				label: "CTA Label",
				placeholder: "View Property",
			},
		]);
	});
});
