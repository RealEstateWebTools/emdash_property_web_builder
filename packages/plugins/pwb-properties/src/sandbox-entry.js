import { definePlugin } from "emdash";

const SETTINGS_KEY = "settings:pwbApiUrl";
const DEFAULT_LOCALE = "en";
const FILTER_ALL = "filter:all";
const FILTER_SALE = "filter:sale";
const FILTER_RENTAL = "filter:rental";
const BACK_TO_LIST = "back_to_list";

function logInfo(ctx, message, data) {
	if (data === undefined) {
		ctx.log.info(`pwb-properties: ${message}`);
		return;
	}
	ctx.log.info(`pwb-properties: ${message}`, data);
}

function logWarn(ctx, message, data) {
	if (data === undefined) {
		ctx.log.warn(`pwb-properties: ${message}`);
		return;
	}
	ctx.log.warn(`pwb-properties: ${message}`, data);
}

function logError(ctx, message, data) {
	if (data === undefined) {
		ctx.log.error(`pwb-properties: ${message}`);
		return;
	}
	ctx.log.error(`pwb-properties: ${message}`, data);
}

function trimTrailingSlash(value) {
	return value.replace(/\/+$/, "");
}

function safeString(value) {
	return typeof value === "string" ? value : "";
}

function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
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

function buildBanner(title, variant = "alert", description) {
	const block = { type: "banner", variant, title };
	if (description) block.description = description;
	return block;
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
		{ type: "header", text: "PWB Connection" },
		{
			type: "context",
			text: "Enter the base URL of your PWB Rails backend. No trailing slash. Example: http://localhost:3000",
		},
	];

	if (error) {
		blocks.push(buildBanner(error, "error"));
	}

	if (currentUrl) {
		blocks.push({
			type: "fields",
			fields: [{ label: "Current URL", value: currentUrl }],
		});
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
			buildBanner(
				"PWB API URL is not configured.",
				"alert",
				"Open Settings and save a valid URL to connect to your PWB backend.",
			),
		);
		return blocks;
	}

	if (error) {
		blocks.push(buildBanner("Could not load properties.", "error", error));
		return blocks;
	}

	if (!search) {
		blocks.push(buildBanner("Property list could not be loaded.", "error"));
		return blocks;
	}

	// Summary stats row
	const statsItems = [
		{ label: "Total", value: String(search.meta.total) },
		{ label: "Page", value: `${search.meta.page} of ${search.meta.total_pages}` },
	];
	if (state.mode === "sale") statsItems.push({ label: "Filter", value: "For Sale" });
	else if (state.mode === "rental") statsItems.push({ label: "Filter", value: "For Rent" });

	blocks.push({ type: "stats", items: statsItems });
	blocks.push({ type: "divider" });

	if (search.data.length === 0) {
		blocks.push({ type: "section", text: "No properties found for the current filter." });
		return blocks;
	}

	for (const property of search.data) {
		const details = [
			property.count_bedrooms != null ? `${property.count_bedrooms} bed` : null,
			property.count_bathrooms != null ? `${property.count_bathrooms} bath` : null,
			property.prop_type_key ?? null,
			compactLocation(property) || null,
		]
			.filter(Boolean)
			.join("  ·  ");

		const price = property.formatted_price ? `*${property.formatted_price}*  ` : "";
		const mode = `${modeLabel(property)}`;
		const subtitle = [price + mode, details].filter(Boolean).join("\n");

		blocks.push({
			type: "section",
			text: `*${property.title}*\n${subtitle}`,
			accessory: {
				type: "button",
				text: "View",
				action_id: `view_property:${property.slug}:${encodeState(state.page, state.mode)}`,
			},
		});
	}

	blocks.push({ type: "divider" });

	const pagination = [];
	if (search.meta.page > 1) {
		pagination.push({
			type: "button",
			text: "← Previous",
			action_id: `page:${search.meta.page - 1}:${state.mode ?? ""}`,
		});
	}
	if (search.meta.page < search.meta.total_pages) {
		pagination.push({
			type: "button",
			text: "Next →",
			action_id: `page:${search.meta.page + 1}:${state.mode ?? ""}`,
		});
	}
	if (pagination.length > 0) {
		blocks.push({ type: "actions", elements: pagination });
	} else {
		blocks.push({
			type: "context",
			text: `Showing all ${search.meta.total} ${search.meta.total === 1 ? "property" : "properties"}.`,
		});
	}

	return blocks;
}

function buildDetailBlocks(property, apiUrl, state) {
	const keyStats = [];
	if (property.formatted_price) {
		keyStats.push({ label: "Price", value: property.formatted_price });
	}
	if (property.count_bedrooms != null) {
		keyStats.push({ label: "Bedrooms", value: String(property.count_bedrooms) });
	}
	if (property.count_bathrooms != null) {
		keyStats.push({ label: "Bathrooms", value: String(property.count_bathrooms) });
	}
	keyStats.push({ label: "Listing Type", value: modeLabel(property) });

	const metaFields = [
		{ label: "Property Type", value: property.prop_type_key ?? "—" },
		{
			label: "Location",
			value: [property.address, compactLocation(property)].filter(Boolean).join(", ") || "—",
		},
		{ label: "Slug / Reference", value: property.slug ?? "—" },
	];

	if (property.status) {
		metaFields.push({ label: "Status", value: property.status });
	}

	const actions = [
		{
			type: "button",
			text: "← Back to list",
			action_id: `back_to_list:${encodeState(state.page, state.mode)}`,
		},
	];

	if (apiUrl) {
		actions.push({
			type: "button",
			text: "View on site ↗",
			url: `${apiUrl}/properties/${property.slug}`,
			style: "primary",
		});
	}

	const blocks = [{ type: "header", text: property.title }];

	if (keyStats.length > 0) {
		blocks.push({ type: "stats", items: keyStats });
	}

	blocks.push({ type: "divider" });
	blocks.push({ type: "fields", fields: metaFields });

	const descriptionText =
		property.description ??
		(Array.isArray(property.page_contents)
			? property.page_contents.find((item) => item.rendered_html)?.rendered_html
			: null);

	if (descriptionText) {
		blocks.push({ type: "divider" });
		blocks.push({
			type: "section",
			text: excerpt(descriptionText, 500),
		});
	}

	blocks.push({ type: "divider" });
	blocks.push({ type: "actions", elements: actions });
	return blocks;
}

async function getConfiguredApiUrl(ctx) {
	const stored = await ctx.kv.get(SETTINGS_KEY);
	const value = typeof stored === "string" ? trimTrailingSlash(stored.trim()) : "";
	logInfo(ctx, "loaded configured API URL", {
		hasValue: Boolean(value),
		value,
	});
	return value;
}

function getSettingValue(interaction, key) {
	if (isRecord(interaction.values) && key in interaction.values) {
		return interaction.values[key];
	}
	if (isRecord(interaction.value) && key in interaction.value) {
		return interaction.value[key];
	}
	if (isRecord(interaction.form) && key in interaction.form) {
		return interaction.form[key];
	}
	if (isRecord(interaction.data) && key in interaction.data) {
		return interaction.data[key];
	}
	return undefined;
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
		logError(ctx, "HTTP client unavailable");
		throw new Error("Plugin HTTP client is not available.");
	}
	logInfo(ctx, "fetching PWB API", { url });
	const res = await ctx.http.fetch(url, {
		headers: { Accept: "application/json" },
	});
	logInfo(ctx, "received PWB API response", { url, status: res.status, ok: res.ok });
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		const message =
			typeof body?.error === "string" ? body.error : `PWB API request failed with ${res.status}.`;
		logError(ctx, "PWB API request failed", { url, status: res.status, message });
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
	logInfo(ctx, "rendering property list", {
		page: state.page,
		mode: state.mode ?? null,
		hasInjectedError: Boolean(error),
	});
	const apiUrl = await getConfiguredApiUrl(ctx);
	if (!apiUrl) {
		logWarn(ctx, "cannot render property list because API URL is not configured", state);
		return {
			blocks: buildListBlocks(null, state, apiUrl),
		};
	}

	if (error) {
		logWarn(ctx, "rendering property list with injected error", {
			page: state.page,
			mode: state.mode ?? null,
			error,
		});
		return {
			blocks: buildListBlocks(null, state, apiUrl, error),
		};
	}

	try {
		const search = await searchProperties(ctx, apiUrl, state.page, state.mode);
		logInfo(ctx, "property list loaded", {
			page: search?.meta?.page,
			totalPages: search?.meta?.total_pages,
			total: search?.meta?.total,
			count: Array.isArray(search?.data) ? search.data.length : null,
			mode: state.mode ?? null,
		});
		return {
			blocks: buildListBlocks(search, state, apiUrl),
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : "Failed to load properties.";
		logError(ctx, "list fetch failed", {
			page: state.page,
			mode: state.mode ?? null,
			message,
		});
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
				logInfo(ctx, "received admin interaction", {
					type: safeString(interaction.type) || null,
					page: currentPage,
					actionId: safeString(interaction.action_id) || null,
					blockId: safeString(interaction.block_id) || null,
					valueKeys: isRecord(interaction.values) ? Object.keys(interaction.values) : [],
				});

				if (interaction.action_id === "save_settings") {
					const candidateUrl = getSettingValue(interaction, "pwbApiUrl");
					logInfo(ctx, "processing settings save", {
						rawValue: safeString(candidateUrl).trim(),
					});
					const validation = validateApiUrl(candidateUrl);
					if (!validation.ok) {
						logWarn(ctx, "settings save rejected", {
							rawValue: safeString(candidateUrl).trim(),
							error: validation.error,
						});
						return {
							blocks: buildSettingsBlocks(safeString(candidateUrl).trim(), validation.error),
							toast: { message: validation.error, type: "error" },
						};
					}
					await ctx.kv.set(SETTINGS_KEY, validation.value);
					logInfo(ctx, "settings saved", {
						key: SETTINGS_KEY,
						value: validation.value,
					});
					return {
						blocks: buildSettingsBlocks(validation.value),
						toast: { message: "PWB API URL saved.", type: "success" },
					};
				}

				if (currentPage === "/settings") {
					logInfo(ctx, "rendering settings page");
					return {
						blocks: buildSettingsBlocks(await getConfiguredApiUrl(ctx)),
					};
				}

				const actionId = safeString(interaction.action_id);
				if (actionId === FILTER_ALL) {
					logInfo(ctx, "filter selected", { mode: null });
					return renderList(ctx, { page: 1 });
				}
				if (actionId === FILTER_SALE) {
					logInfo(ctx, "filter selected", { mode: "sale" });
					return renderList(ctx, { page: 1, mode: "sale" });
				}
				if (actionId === FILTER_RENTAL) {
					logInfo(ctx, "filter selected", { mode: "rental" });
					return renderList(ctx, { page: 1, mode: "rental" });
				}
				if (actionId.startsWith("page:")) {
					const state = parsePageAction(actionId);
					logInfo(ctx, "pagination requested", state);
					return renderList(ctx, state);
				}
				if (actionId.startsWith("back_to_list:") || actionId === BACK_TO_LIST) {
					const state = parseBackAction(actionId);
					logInfo(ctx, "returning to list", state);
					return renderList(ctx, state);
				}
				if (actionId.startsWith("view_property:")) {
					const { slug, state } = parseViewAction(actionId);
					logInfo(ctx, "property detail requested", {
						slug,
						page: state.page,
						mode: state.mode ?? null,
					});
					const apiUrl = await getConfiguredApiUrl(ctx);
					if (!apiUrl) {
						logWarn(ctx, "cannot load property detail because API URL is not configured", {
							slug,
						});
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
						logWarn(ctx, "property detail request missing slug");
						return renderList(ctx, state, "Property slug is missing.");
					}
					try {
						const property = await getProperty(ctx, apiUrl, slug);
						logInfo(ctx, "property detail loaded", {
							slug: property.slug,
							title: property.title,
						});
						return {
							blocks: buildDetailBlocks(property, apiUrl, state),
						};
					} catch (err) {
						const message = err instanceof Error ? err.message : "Failed to load property.";
						logError(ctx, "detail fetch failed", { slug, message });
						return renderList(ctx, state, message);
					}
				}

				logInfo(ctx, "defaulting to initial property list view");
				return renderList(ctx, { page: 1 });
			},
		},
	},
});
