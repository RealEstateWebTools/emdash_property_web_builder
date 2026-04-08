import { definePlugin } from "emdash";
import { fetchPropertyOptions, getPwbApiBase } from "./astro/pwb.js";

const PORTABLE_TEXT_BLOCKS = [
	{
		type: "propertyEmbed",
		label: "Property",
		icon: "link-external",
		description: "Embed a live property listing from PWB",
		placeholder: "Paste a PWB property slug or URL",
		fields: [
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
		],
	},
];

export function pwbPropertyEmbedsPlugin() {
	return {
		id: "pwb-property-embeds",
		version: "0.1.0",
		format: "native",
		entrypoint: "pwb-property-embeds",
		componentsEntry: "pwb-property-embeds/astro",
		options: {},
	};
}

export function createPlugin() {
	return definePlugin({
		id: "pwb-property-embeds",
		version: "0.1.0",
		routes: {
			"properties/list": {
				handler: async () => {
					try {
						const apiBase = getPwbApiBase();
						const items = await fetchPropertyOptions(fetch, apiBase, "en");
						return { items };
					} catch {
						return { items: [] };
					}
				},
			},
		},
		admin: {
			portableTextBlocks: PORTABLE_TEXT_BLOCKS,
		},
	});
}

export default createPlugin;
