const DEFAULT_LOCALE = "en";
const SUPPORTED_LOCALES = new Set(["es", "fr"]);
const PROPERTY_SLUG_PATTERN = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;
const EMBED_TRANSLATIONS = {
	es: {
		"View Property": "Ver propiedad",
		"Featured Property": "Propiedad destacada",
		"Property unavailable": "Propiedad no disponible",
		"Property slug is missing": "Falta el slug de la propiedad",
		"Property slug is invalid": "El slug de la propiedad no es valido",
		bed: "hab.",
		bath: "bano",
	},
	fr: {
		"View Property": "Voir le bien",
		"Featured Property": "Bien en vedette",
		"Property unavailable": "Bien indisponible",
		"Property slug is missing": "Slug du bien manquant",
		"Property slug is invalid": "Slug du bien invalide",
		bed: "ch.",
		bath: "sdb",
	},
};

function trimTrailingSlash(value) {
	return value.replace(/\/+$/, "");
}

export function normalizeLocale(locale) {
	return SUPPORTED_LOCALES.has(locale) ? locale : DEFAULT_LOCALE;
}

export function translateEmbedLabel(locale, text) {
	const normalizedLocale = normalizeLocale(locale);
	return EMBED_TRANSLATIONS[normalizedLocale]?.[text] ?? text;
}

export function normalizePropertySlug(value) {
	if (typeof value !== "string") {
		return "";
	}

	let slug = value.trim();
	if (!slug) {
		return "";
	}

	try {
		const url = new URL(slug);
		slug = url.pathname;
	} catch {
		// Non-URL values are treated as raw slugs or paths.
	}

	slug = slug.split(/[?#]/, 1)[0]?.trim() ?? "";
	slug = slug.replace(/^\/+|\/+$/g, "");

	if (!slug) {
		return "";
	}

	const segments = slug.split("/").filter(Boolean);
	const propertiesIndex = segments.lastIndexOf("properties");

	if (propertiesIndex >= 0 && segments[propertiesIndex + 1]) {
		return segments[propertiesIndex + 1];
	}

	return segments[segments.length - 1] ?? "";
}

export function getPropertySlugValidationError(value, locale = DEFAULT_LOCALE) {
	const slug = normalizePropertySlug(value);
	if (!slug) {
		return translateEmbedLabel(locale, "Property slug is missing");
	}

	if (!PROPERTY_SLUG_PATTERN.test(slug)) {
		return translateEmbedLabel(locale, "Property slug is invalid");
	}

	return "";
}

export function getPropertiesPath(locale = DEFAULT_LOCALE) {
	const normalizedLocale = normalizeLocale(locale);
	return normalizedLocale === DEFAULT_LOCALE ? "/properties" : `/${normalizedLocale}/properties`;
}

export function getPwbApiBase() {
	const url = import.meta.env.PWB_API_URL;
	if (!url) {
		throw new Error("PWB_API_URL environment variable is not set");
	}
	return trimTrailingSlash(url);
}

function buildPropertyOptionsUrl(apiBase, locale = DEFAULT_LOCALE, params = {}) {
	const normalizedLocale = normalizeLocale(locale);
	const url = new URL(`${trimTrailingSlash(apiBase)}/api_public/v1/${normalizedLocale}/properties`);
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== null && value !== "") {
			url.searchParams.set(key, String(value));
		}
	}
	return url;
}

function formatPropertyOptionName(property) {
	const meta = [property.formatted_price, property.reference].filter(Boolean).join(" • ");
	return meta ? `${property.title} (${meta})` : property.title;
}

async function requestPropertyOptions(fetchImpl, url) {
	const res = await fetchImpl(url.toString(), {
		headers: { Accept: "application/json" },
	});

	if (!res.ok) {
		throw new Error(`Failed to load PWB property shortlist: ${res.status}`);
	}

	const body = await res.json();
	return Array.isArray(body?.data) ? body.data : [];
}

export async function fetchPropertyOptions(fetchImpl, apiBase, locale = DEFAULT_LOCALE) {
	const featuredUrl = buildPropertyOptionsUrl(apiBase, locale, { featured: "true", per_page: 12 });
	let properties = await requestPropertyOptions(fetchImpl, featuredUrl);

	if (properties.length === 0) {
		const fallbackUrl = buildPropertyOptionsUrl(apiBase, locale, { per_page: 12 });
		properties = await requestPropertyOptions(fetchImpl, fallbackUrl);
	}

	return properties
		.filter((property) => typeof property?.slug === "string" && property.slug.trim())
		.map((property) => ({
			id: property.slug,
			name: formatPropertyOptionName(property),
		}));
}

export async function fetchPropertyBySlug(fetchImpl, apiBase, slug, locale = DEFAULT_LOCALE) {
	const requestedLocale = normalizeLocale(locale);
	const localesToTry = requestedLocale === DEFAULT_LOCALE ? [DEFAULT_LOCALE] : [requestedLocale, DEFAULT_LOCALE];

	for (const currentLocale of localesToTry) {
		const url = `${trimTrailingSlash(apiBase)}/api_public/v1/${currentLocale}/properties/${encodeURIComponent(slug)}`;
		const res = await fetchImpl(url, {
			headers: { Accept: "application/json" },
		});

		if (res.status === 404) {
			continue;
		}

		if (!res.ok) {
			throw new Error(`Failed to load PWB property ${slug}: ${res.status}`);
		}

		return res.json();
	}

	return null;
}

export async function getPropertyBySlug(slug, locale = DEFAULT_LOCALE) {
	const apiBase = getPwbApiBase();
	return fetchPropertyBySlug(fetch, apiBase, normalizePropertySlug(slug), locale);
}

export function getPropertyUrl(slug, locale = DEFAULT_LOCALE) {
	const normalizedSlug = normalizePropertySlug(slug);
	return normalizedSlug ? `${getPropertiesPath(locale)}/${normalizedSlug}` : getPropertiesPath(locale);
}
