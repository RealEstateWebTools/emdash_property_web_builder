export function pwbPropertiesPlugin() {
	return {
		id: "pwb-properties",
		version: "0.1.0",
		format: "standard",
		entrypoint: "pwb-properties/sandbox",
		options: {},
		capabilities: ["network:fetch:any"],
		adminPages: [
			{ path: "/", label: "Properties", icon: "list" },
			{ path: "/settings", label: "Search & Listings", icon: "settings" },
		],
	};
}
