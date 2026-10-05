const DEFAULT_LOCALE = "en";
const SUPPORTED_LOCALES = new Set(["es", "fr"]);
// PWB slugs use hyphens and underscores (e.g. "country_house-south-brunswick-re-s1-13").
const PROPERTY_SLUG_PATTERN = /^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*$/;
const EMBED_TRANSLATIONS = {
	es: {
		"View Property": "Ver propiedad",
		"Featured Property": "Propiedad destacada",
		"Property unavailable": "Propiedad no disponible",
		"Property slug is missing": "Falta el slug de la propiedad",
		"Property slug is invalid": "El slug de la propiedad no es valido",
		bed: "hab.",
		bath: "bano",
		"View all listings": "Ver todas las propiedades",
		"No listings to show right now.": "No hay propiedades para mostrar en este momento.",
		"Listings are temporarily unavailable.": "Las propiedades no estan disponibles temporalmente.",
	},
	fr: {
		"View Property": "Voir le bien",
		"Featured Property": "Bien en vedette",
		"Property unavailable": "Bien indisponible",
		"Property slug is missing": "Slug du bien manquant",
		"Property slug is invalid": "Slug du bien invalide",
		bed: "ch.",
		bath: "sdb",
		"View all listings": "Voir tous les biens",
		"No listings to show right now.": "Aucun bien a afficher pour le moment.",
		"Listings are temporarily unavailable.": "Les biens sont temporairement indisponibles.",
	},
};


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

function isNotFound(error) {
	return Boolean(error) && typeof error === "object" && error.status === 404;
}

function formatPropertyOptionName(property) {
	const meta = [property.formatted_price, property.reference].filter(Boolean).join(" • ");
	return meta ? `${property.title} (${meta})` : property.title;
}

/**
 * Editor quick-pick options: featured listings, or the newest when none are
 * featured. `source` is the host listing source (PWB or native EmDash).
 */
export async function fetchPropertyOptions(source) {
	let properties = (await source.searchProperties({ featured: "true", per_page: 12 })).data ?? [];
	if (properties.length === 0) {
		properties = (await source.searchProperties({ per_page: 12 })).data ?? [];
	}

	return properties
		.filter((property) => typeof property?.slug === "string" && property.slug.trim())
		.map((property) => ({
			id: property.slug,
			name: formatPropertyOptionName(property),
		}));
}

/**
 * Load one property for an embed, falling back to the default locale when the
 * localized listing doesn't exist. Returns null when it exists in neither;
 * other failures propagate.
 *
 * @param {(locale: string) => { getProperty(slug: string): Promise<any> }} getSource
 */
export async function fetchPropertyBySlug(getSource, slug, locale = DEFAULT_LOCALE) {
	const requestedLocale = normalizeLocale(locale);
	const localesToTry = requestedLocale === DEFAULT_LOCALE ? [DEFAULT_LOCALE] : [requestedLocale, DEFAULT_LOCALE];

	for (const currentLocale of localesToTry) {
		try {
			return await getSource(currentLocale).getProperty(slug);
		} catch (error) {
			if (!isNotFound(error)) throw error;
		}
	}
	return null;
}

export function getPropertyUrl(slug, locale = DEFAULT_LOCALE) {
	const normalizedSlug = normalizePropertySlug(slug);
	return normalizedSlug ? `${getPropertiesPath(locale)}/${normalizedSlug}` : getPropertiesPath(locale);
}
