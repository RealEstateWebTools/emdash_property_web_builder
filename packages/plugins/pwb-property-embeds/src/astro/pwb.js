const DEFAULT_LOCALE = "en";
const SUPPORTED_LOCALES = new Set(["es", "fr"]);
const EMBED_TRANSLATIONS = {
	es: {
		"View Property": "Ver propiedad",
		"Featured Property": "Propiedad destacada",
		"Property unavailable": "Propiedad no disponible",
		"Property slug is missing": "Falta el slug de la propiedad",
		bed: "hab.",
		bath: "bano",
	},
	fr: {
		"View Property": "Voir le bien",
		"Featured Property": "Bien en vedette",
		"Property unavailable": "Bien indisponible",
		"Property slug is missing": "Slug du bien manquant",
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
	return fetchPropertyBySlug(fetch, apiBase, slug, locale);
}

export function getPropertyUrl(slug, locale = DEFAULT_LOCALE) {
	return `${getPropertiesPath(locale)}/${slug}`;
}
