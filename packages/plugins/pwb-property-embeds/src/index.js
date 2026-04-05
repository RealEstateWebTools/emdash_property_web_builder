import { definePlugin } from "emdash";

const PORTABLE_TEXT_BLOCKS = [
	{
		type: "propertyEmbed",
		label: "Property",
		icon: "link-external",
		description: "Embed a live property listing from PWB",
		placeholder: "Enter a PWB property slug",
		fields: [
			{
				type: "text_input",
				action_id: "id",
				label: "Property Slug",
				placeholder: "beautiful-villa-marbella",
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
		admin: {
			portableTextBlocks: PORTABLE_TEXT_BLOCKS,
		},
	});
}

export default createPlugin;
