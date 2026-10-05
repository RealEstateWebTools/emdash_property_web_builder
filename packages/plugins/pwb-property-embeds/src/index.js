import { definePlugin } from "emdash";
import { fetchPropertyTypeOptions } from "./astro/collection.js";
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
	{
		type: "listingCollection",
		label: "Listing Collection",
		icon: "layout-grid",
		description: "A curated grid of live PWB listings: featured, newest, or hand-picked",
		fields: [
			{ type: "text_input", action_id: "heading", label: "Heading" },
			{ type: "text_input", action_id: "intro", label: "Intro text" },
			{
				type: "select",
				action_id: "source",
				label: "Listings",
				options: [
					{ label: "Featured listings", value: "featured" },
					{ label: "Newest listings", value: "newest" },
					{ label: "Hand-picked listings", value: "handpicked" },
				],
				initial_value: "featured",
			},
			{
				type: "text_input",
				action_id: "slugs",
				label: "Hand-picked properties (slugs or URLs, comma-separated)",
				placeholder: "villa-marbella, /properties/old-town-apartment",
			},
			{
				type: "select",
				action_id: "saleOrRental",
				label: "For sale or rent",
				options: [
					{ label: "For sale", value: "sale" },
					{ label: "For rent", value: "rental" },
				],
				initial_value: "sale",
			},
			{
				type: "select",
				action_id: "propertyType",
				label: "Property type (featured/newest only)",
				options: [],
				optionsRoute: "properties/types",
			},
			{
				type: "select",
				action_id: "bedroomsFrom",
				label: "Minimum bedrooms (featured/newest only)",
				options: [
					{ label: "Any", value: "" },
					{ label: "1+", value: "1" },
					{ label: "2+", value: "2" },
					{ label: "3+", value: "3" },
					{ label: "4+", value: "4" },
					{ label: "5+", value: "5" },
				],
				initial_value: "",
			},
			{
				type: "select",
				action_id: "limit",
				label: "How many",
				options: [
					{ label: "3", value: "3" },
					{ label: "6", value: "6" },
					{ label: "9", value: "9" },
					{ label: "12", value: "12" },
				],
				initial_value: "6",
			},
			{
				type: "text_input",
				action_id: "viewAllLabel",
				label: "View-all link label",
				placeholder: "Optional — defaults to \"View all listings\"",
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
			"properties/types": {
				handler: async () => {
					try {
						return { items: await fetchPropertyTypeOptions(fetch, getPwbApiBase(), "en") };
					} catch {
						return { items: [] };
					}
				},
			},
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
