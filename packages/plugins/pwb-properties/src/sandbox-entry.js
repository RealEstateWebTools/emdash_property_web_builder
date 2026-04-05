import { definePlugin } from "emdash";

const SETTINGS_KEY = "settings:pwbApiUrl";
const DEFAULT_LOCALE = "en";
const FILTER_ALL = "filter:all";
const FILTER_SALE = "filter:sale";
const FILTER_RENTAL = "filter:rental";
const BACK_TO_LIST = "back_to_list";

function trimTrailingSlash(value) {
	return value.replace(/\/+$/, "");
}

function safeString(value) {
	return typeof value === "string" ? value : "";
}

function normalizeMode(value) {
	return value === "sale" || value === "rental" ? value : undefined;
}

function encodeState(page, mode) {
	return JSON.stringify({ page, mode: mode ?? null });
}

function decodeState(value) {
	if (typeof value !== "string" || !value) return { page: 1 };
	try {
		const parsed = JSON.parse(value);
		const page =
			typeof parsed.page === "number" && Number.isInteger(parsed.page) && parsed.page > 0
				? parsed.page
				: 1;
		return { page, mode: normalizeMode(parsed.mode) };
	} catch {
		return { page: 1 };
	}
}

function modeLabel(property) {
	if (property.for_sale && property.for_rent) return "Sale + Rent";
	if (property.for_sale) return "Sale";
	if (property.for_rent) return "Rent";
	return "Unknown";
}

function compactLocation(property) {
	return [property.city, property.region, property.country_code].filter(Boolean).join(", ");
}

function stripHtml(html) {
	return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function excerpt(value, max = 320) {
	const text = stripHtml(value);
	if (text.length <= max) return text;
	return `${text.slice(0, max - 1).trimEnd()}…`;
}

function buildBanner(text, tone = "warning") {
	return {
		type: "banner",
		tone,
		text,
	};
}

function buildFilterActions(activeMode) {
	return {
		type: "actions",
		elements: [
			{
				type: "button",
				text: "All",
				action_id: FILTER_ALL,
				style: activeMode ? undefined : "primary",
			},
			{
				type: "button",
				text: "For Sale",
				action_id: FILTER_SALE,
				style: activeMode === "sale" ? "primary" : undefined,
			},
			{
				type: "button",
				text: "For Rent",
				action_id: FILTER_RENTAL,
				style: activeMode === "rental" ? "primary" : undefined,
			},
		],
	};
}

function buildSettingsBlocks(currentUrl, error) {
	const blocks = [
		{ type: "header", text: "PWB Settings" },
		{
			type: "context",
			text: "Set the base URL for the PWB API, for example http://localhost:3000 or https://example.com.",
		},
	];

	if (error) {
		blocks.push(buildBanner(error, "error"));
	}

	blocks.push({
		type: "form",
		block_id: "settings",
		fields: [
			{
				type: "text_input",
				action_id: "pwbApiUrl",
				label: "PWB API URL",
				initial_value: currentUrl,
				placeholder: "https://example.com",
			},
		],
		submit: { label: "Save", action_id: "save_settings" },
	});

	return blocks;
}

function buildListBlocks(search, state, apiUrl, error) {
	const blocks = [{ type: "header", text: "Properties" }, buildFilterActions(state.mode)];

	if (!apiUrl) {
		blocks.push(
			buildBanner("PWB API URL is not configured. Open Settings and save a valid URL.", "warning"),
		);
		return blocks;
	}

	if (error) {
		blocks.push(buildBanner(error, "error"));
		return blocks;
	}

	if (!search) {
		blocks.push(buildBanner("Property list could not be loaded.", "error"));
		return blocks;
	}

	blocks.push({
		type: "context",
		text: `${search.meta.total} properties found. Page ${search.meta.page} of ${search.meta.total_pages}.`,
	});

	if (search.data.length === 0) {
		blocks.push({ type: "section", text: "No properties found for the current filter." });
		return blocks;
	}

	for (const property of search.data) {
		const meta = [
			property.formatted_price ?? null,
			modeLabel(property),
			property.count_bedrooms != null ? `${property.count_bedrooms} bd` : null,
			property.count_bathrooms != null ? `${property.count_bathrooms} ba` : null,
			property.prop_type_key,
			compactLocation(property),
		]
			.filter(Boolean)
			.join(" · ");

		blocks.push({
			type: "section",
			text: meta ? `*${property.title}*\n${meta}` : `*${property.title}*`,
			accessory: {
				type: "button",
				text: "View",
				action_id: `view_property:${property.slug}:${encodeState(state.page, state.mode)}`,
			},
		});
	}

	const pagination = [];
	if (search.meta.page > 1) {
		pagination.push({
			type: "button",
			text: "Previous",
			action_id: `page:${search.meta.page - 1}:${state.mode ?? ""}`,
		});
	}
	if (search.meta.page < search.meta.total_pages) {
		pagination.push({
			type: "button",
			text: "Next",
			action_id: `page:${search.meta.page + 1}:${state.mode ?? ""}`,
		});
	}
	if (pagination.length > 0) {
		blocks.push({ type: "actions", elements: pagination });
	}

	return blocks;
}

function buildDetailBlocks(property, apiUrl, state) {
	const fields = [
		{ label: "Price", value: property.formatted_price ?? "—" },
		{ label: "Mode", value: modeLabel(property) },
		{
			label: "Bedrooms",
			value: property.count_bedrooms != null ? String(property.count_bedrooms) : "—",
		},
		{
			label: "Bathrooms",
			value: property.count_bathrooms != null ? String(property.count_bathrooms) : "—",
		},
		{ label: "Type", value: property.prop_type_key ?? "—" },
		{
			label: "Location",
			value: [property.address, compactLocation(property)].filter(Boolean).join(", ") || "—",
		},
	];

	const actions = [
		{
			type: "button",
			text: "Back",
			action_id: `back_to_list:${encodeState(state.page, state.mode)}`,
		},
	];

	if (apiUrl) {
		actions.push({
			type: "button",
			text: "Open Public Page",
			url: `${apiUrl}/properties/${property.slug}`,
			style: "primary",
		});
	}

	const blocks = [
		{ type: "header", text: property.title },
		{
			type: "fields",
			fields,
		},
	];

	if (property.description) {
		blocks.push({
			type: "section",
			text: excerpt(property.description),
		});
	}

	if (Array.isArray(property.page_contents) && property.page_contents.length > 0) {
		const firstContent = property.page_contents.find((item) => item.rendered_html)?.rendered_html;
		if (firstContent) {
			blocks.push({
				type: "context",
				text: excerpt(firstContent, 220),
			});
		}
	}

	blocks.push({ type: "actions", elements: actions });
	return blocks;
}

async function getConfiguredApiUrl(ctx) {
	const stored = await ctx.kv.get(SETTINGS_KEY);
	return typeof stored === "string" ? trimTrailingSlash(stored.trim()) : "";
}

function validateApiUrl(input) {
	const raw = safeString(input).trim();
	if (!raw) {
		return { ok: false, error: "PWB API URL is required." };
	}

	let parsed;
	try {
		parsed = new URL(raw);
	} catch {
		return { ok: false, error: "PWB API URL must be a valid absolute URL." };
	}

	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		return { ok: false, error: "PWB API URL must use http or https." };
	}

	return { ok: true, value: trimTrailingSlash(parsed.toString()) };
}

async function fetchJson(ctx, url) {
	if (!ctx.http) {
		throw new Error("Plugin HTTP client is not available.");
	}
	const res = await ctx.http.fetch(url, {
		headers: { Accept: "application/json" },
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		const message =
			typeof body?.error === "string" ? body.error : `PWB API request failed with ${res.status}.`;
		throw new Error(message);
	}
	return res.json();
}

async function searchProperties(ctx, apiUrl, page, mode) {
	const url = new URL(`${apiUrl}/api_public/v1/${DEFAULT_LOCALE}/properties`);
	url.searchParams.set("page", String(page));
	url.searchParams.set("per_page", "20");
	if (mode) {
		url.searchParams.set("sale_or_rental", mode);
	}
	return fetchJson(ctx, url.toString());
}

async function getProperty(ctx, apiUrl, slug) {
	const url = `${apiUrl}/api_public/v1/${DEFAULT_LOCALE}/properties/${encodeURIComponent(slug)}`;
	return fetchJson(ctx, url);
}

function parsePageAction(actionId) {
	const [, pageValue, modeValue] = actionId.split(":");
	const page = Number.parseInt(pageValue ?? "1", 10);
	return {
		page: Number.isInteger(page) && page > 0 ? page : 1,
		mode: normalizeMode(modeValue || undefined),
	};
}

function parseViewAction(actionId) {
	const firstColon = actionId.indexOf(":");
	const secondColon = actionId.indexOf(":", firstColon + 1);
	if (firstColon === -1 || secondColon === -1) {
		return { slug: "", state: { page: 1 } };
	}
	return {
		slug: actionId.slice(firstColon + 1, secondColon),
		state: decodeState(actionId.slice(secondColon + 1)),
	};
}

function parseBackAction(actionId) {
	const firstColon = actionId.indexOf(":");
	if (firstColon === -1) return { page: 1 };
	return decodeState(actionId.slice(firstColon + 1));
}

async function renderList(ctx, state, error) {
	const apiUrl = await getConfiguredApiUrl(ctx);
	if (!apiUrl) {
		return {
			blocks: buildListBlocks(null, state, apiUrl),
		};
	}

	if (error) {
		return {
			blocks: buildListBlocks(null, state, apiUrl, error),
		};
	}

	try {
		const search = await searchProperties(ctx, apiUrl, state.page, state.mode);
		return {
			blocks: buildListBlocks(search, state, apiUrl),
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : "Failed to load properties.";
		ctx.log.error(`pwb-properties: list fetch failed: ${message}`);
		return {
			blocks: buildListBlocks(null, state, apiUrl, message),
		};
	}
}

export default definePlugin({
	routes: {
		admin: {
			handler: async (routeCtx, ctx) => {
				const interaction = routeCtx.input ?? {};
				const currentPage = safeString(interaction.page) || "/";

				if (currentPage === "/settings") {
					if (interaction.action_id === "save_settings") {
						const validation = validateApiUrl(interaction.values?.pwbApiUrl);
						if (!validation.ok) {
							return {
								blocks: buildSettingsBlocks(
									safeString(interaction.values?.pwbApiUrl).trim(),
									validation.error,
								),
								toast: { message: validation.error, type: "error" },
							};
						}
						await ctx.kv.set(SETTINGS_KEY, validation.value);
						return {
							blocks: buildSettingsBlocks(validation.value),
							toast: { message: "PWB API URL saved.", type: "success" },
						};
					}

					return {
						blocks: buildSettingsBlocks(await getConfiguredApiUrl(ctx)),
					};
				}

				const actionId = safeString(interaction.action_id);
				if (actionId === FILTER_ALL) {
					return renderList(ctx, { page: 1 });
				}
				if (actionId === FILTER_SALE) {
					return renderList(ctx, { page: 1, mode: "sale" });
				}
				if (actionId === FILTER_RENTAL) {
					return renderList(ctx, { page: 1, mode: "rental" });
				}
				if (actionId.startsWith("page:")) {
					return renderList(ctx, parsePageAction(actionId));
				}
				if (actionId.startsWith("back_to_list:") || actionId === BACK_TO_LIST) {
					return renderList(ctx, parseBackAction(actionId));
				}
				if (actionId.startsWith("view_property:")) {
					const { slug, state } = parseViewAction(actionId);
					const apiUrl = await getConfiguredApiUrl(ctx);
					if (!apiUrl) {
						return {
							blocks: buildListBlocks(
								null,
								state,
								apiUrl,
								"PWB API URL is not configured. Open Settings and save a valid URL.",
							),
						};
					}
					if (!slug) {
						return renderList(ctx, state, "Property slug is missing.");
					}
					try {
						const property = await getProperty(ctx, apiUrl, slug);
						return {
							blocks: buildDetailBlocks(property, apiUrl, state),
						};
					} catch (err) {
						const message = err instanceof Error ? err.message : "Failed to load property.";
						ctx.log.error(`pwb-properties: detail fetch failed for ${slug}: ${message}`);
						return renderList(ctx, state, message);
					}
				}

				return renderList(ctx, { page: 1 });
			},
		},
	},
});
