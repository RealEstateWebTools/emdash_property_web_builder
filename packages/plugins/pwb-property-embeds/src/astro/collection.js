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
import { getPropertiesPath, normalizePropertySlug } from "./pwb.js";

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

function isNotFound(error) {
	return Boolean(error) && typeof error === "object" && error.status === 404;
}

/**
 * Load the listings for a collection from a listing source — the host site's
 * PWB or native EmDash source (`pwb-host-listing-source`). Hand-picked slugs
 * keep their order and silently drop listings that no longer exist; a
 * featured set with fewer than two results is topped up with the newest
 * matching listings.
 *
 * @param {{ searchProperties(params: object): Promise<{ data: any[] }>, getProperty(slug: string): Promise<any> }} source
 */
export async function fetchListingCollection(source, config) {
	if (config.source === "handpicked") {
		const results = await Promise.all(
			config.slugs.map((slug) =>
				source.getProperty(slug).catch((error) => {
					if (isNotFound(error)) return null;
					throw error;
				}),
			),
		);
		return results.filter(Boolean);
	}

	const params = buildCollectionSearchParams(config);
	const primary = (await source.searchProperties(params)).data ?? [];
	if (config.source !== "featured" || primary.length >= Math.min(2, config.limit)) {
		return primary.slice(0, config.limit);
	}

	const { featured: _featured, ...fallbackParams } = params;
	const fallback = (await source.searchProperties(fallbackParams)).data ?? [];
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

/** Admin dropdown options from the listing source's property types. */
export async function fetchPropertyTypeOptions(source) {
	const config = await source.getSearchConfig();
	return (config?.property_types ?? []).map((type) => ({ id: type.key, name: type.label }));
}
