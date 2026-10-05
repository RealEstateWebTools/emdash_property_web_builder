/**
 * Listing collections: a curated set of live PWB listings that editors can
 * drop into any Portable Text field (pages, posts, area/landing pages).
 *
 * Sources:
 *   - featured    PWB "highlighted" listings, topped up with newest if sparse
 *   - newest      most recent listings
 *   - handpicked  explicit slugs/URLs, in the editor's order
 *
 * Filters (sale/rent, property type, min bedrooms) apply to featured/newest
 * and map directly onto PWB search params. There is no "any" option: the PWB
 * search defaults sale_or_rental to "sale", so a set is always one or the other. The PWB list endpoint returns no
 * location fields and has no location filter, so area pages select listings
 * by hand-picking them.
 */
import { getPropertiesPath, normalizeLocale, normalizePropertySlug } from "./pwb.js";

export const COLLECTION_SOURCES = ["featured", "newest", "handpicked"];
export const COLLECTION_LIMITS = [3, 6, 9, 12];
const DEFAULT_LIMIT = 6;
const MAX_HANDPICKED = 12;

function text(value) {
	return typeof value === "string" ? value.trim() : "";
}

/** Split a comma/newline separated list of slugs or property URLs. */
export function parseHandpickedSlugs(value) {
	const seen = new Set();
	const slugs = [];
	for (const part of text(value).split(/[\n,]+/)) {
		const slug = normalizePropertySlug(part);
		if (slug && !seen.has(slug)) {
			seen.add(slug);
			slugs.push(slug);
		}
	}
	return slugs.slice(0, MAX_HANDPICKED);
}

/** Read and sanitize a listingCollection block's fields. */
export function readListingCollectionConfig(node) {
	const source = COLLECTION_SOURCES.includes(node?.source) ? node.source : "featured";
	const limitValue = Number(node?.limit);
	const limit = COLLECTION_LIMITS.includes(limitValue) ? limitValue : DEFAULT_LIMIT;
	const saleOrRental = node?.saleOrRental === "rental" ? "rental" : "sale";
	const bedrooms = Number(node?.bedroomsFrom);

	return {
		heading: text(node?.heading),
		intro: text(node?.intro),
		source,
		limit,
		saleOrRental,
		propertyType: text(node?.propertyType),
		bedroomsFrom: Number.isInteger(bedrooms) && bedrooms > 0 && bedrooms <= 10 ? bedrooms : null,
		slugs: source === "handpicked" ? parseHandpickedSlugs(node?.slugs) : [],
		viewAllLabel: text(node?.viewAllLabel),
	};
}

/** PWB search params for featured/newest sources. */
export function buildCollectionSearchParams(config) {
	const params = { sale_or_rental: config.saleOrRental, per_page: config.limit };
	if (config.source === "featured") params.featured = "true";
	if (config.propertyType) params.property_type = config.propertyType;
	if (config.bedroomsFrom) params.bedrooms_from = String(config.bedroomsFrom);
	return params;
}

/** Link to the matching search results, or null for hand-picked sets. */
export function buildCollectionViewAllHref(config, locale) {
	if (config.source === "handpicked") return null;
	const search = new URLSearchParams();
	if (config.saleOrRental === "rental") search.set("mode", "rental");
	if (config.propertyType) search.set("type", config.propertyType);
	if (config.bedroomsFrom) search.set("bedrooms", String(config.bedroomsFrom));
	const query = search.toString();
	const path = getPropertiesPath(locale);
	return query ? `${path}?${query}` : path;
}

function listUrl(apiBase, locale, params) {
	const url = new URL(`${apiBase}/api_public/v1/${normalizeLocale(locale)}/properties`);
	for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
	return url.toString();
}

async function searchListings(fetchImpl, apiBase, locale, params) {
	const res = await fetchImpl(listUrl(apiBase, locale, params), { headers: { Accept: "application/json" } });
	if (!res.ok) throw new Error(`Failed to load PWB listings: ${res.status}`);
	const body = await res.json();
	return Array.isArray(body?.data) ? body.data : [];
}

async function fetchDetail(fetchImpl, apiBase, locale, slug) {
	const url = `${apiBase}/api_public/v1/${normalizeLocale(locale)}/properties/${encodeURIComponent(slug)}`;
	const res = await fetchImpl(url, { headers: { Accept: "application/json" } });
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(`Failed to load PWB property ${slug}: ${res.status}`);
	return res.json();
}

/**
 * Load the listings for a collection. Hand-picked slugs keep their order and
 * silently drop listings that no longer exist; a featured set with fewer than
 * two results is topped up with the newest matching listings.
 */
export async function fetchListingCollection(fetchImpl, apiBase, config, locale) {
	if (config.source === "handpicked") {
		const results = await Promise.all(config.slugs.map((slug) => fetchDetail(fetchImpl, apiBase, locale, slug)));
		return results.filter(Boolean);
	}

	const params = buildCollectionSearchParams(config);
	const primary = await searchListings(fetchImpl, apiBase, locale, params);
	if (config.source !== "featured" || primary.length >= Math.min(2, config.limit)) {
		return primary.slice(0, config.limit);
	}

	const { featured: _featured, ...fallbackParams } = params;
	const fallback = await searchListings(fetchImpl, apiBase, locale, fallbackParams);
	const seen = new Set(primary.map((item) => item.slug));
	const combined = [...primary];
	for (const item of fallback) {
		if (combined.length >= config.limit) break;
		if (!seen.has(item.slug)) {
			seen.add(item.slug);
			combined.push(item);
		}
	}
	return combined;
}

/** Admin dropdown options from the site's own property-type facets. */
export async function fetchPropertyTypeOptions(fetchImpl, apiBase, locale = "en") {
	const url = `${apiBase}/api_public/v1/${normalizeLocale(locale)}/search/facets`;
	const res = await fetchImpl(url, { headers: { Accept: "application/json" } });
	if (!res.ok) throw new Error(`Failed to load PWB property types: ${res.status}`);
	const body = await res.json();
	const types = body?.property_types && typeof body.property_types === "object" ? body.property_types : {};
	return Object.keys(types).map((key) => {
		const label = key.replace(/^types\./, "").replace(/[_-]+/g, " ");
		return { id: key, name: label.charAt(0).toUpperCase() + label.slice(1) };
	});
}
