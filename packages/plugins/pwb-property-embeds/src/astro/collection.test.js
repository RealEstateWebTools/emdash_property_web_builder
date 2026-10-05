import { describe, expect, it, vi } from "vitest";
import {
	buildCollectionSearchParams,
	buildCollectionViewAllHref,
	fetchListingCollection,
	fetchPropertyTypeOptions,
	parseHandpickedSlugs,
	readListingCollectionConfig,
} from "./collection.js";

const API = "https://pwb.example";

function listing(slug) {
	return { slug, title: slug, formatted_price: "€1", count_bedrooms: 2, count_bathrooms: 1 };
}

/** fetch stub routing by URL; records every requested URL. */
function stubFetch(routes) {
	const calls = [];
	const impl = vi.fn(async (input) => {
		const url = new URL(String(input));
		calls.push(url);
		for (const [match, respond] of routes) {
			if (match(url)) {
				const { status = 200, body } = respond(url);
				return { ok: status < 400, status, json: async () => body };
			}
		}
		return { ok: false, status: 404, json: async () => ({}) };
	});
	return { impl, calls };
}

describe("readListingCollectionConfig", () => {
	it("defaults to six featured listings for sale", () => {
		expect(readListingCollectionConfig({})).toEqual({
			heading: "",
			intro: "",
			source: "featured",
			limit: 6,
			saleOrRental: "sale",
			propertyType: "",
			bedroomsFrom: null,
			slugs: [],
			viewAllLabel: "",
		});
	});

	it("sanitizes unknown values instead of passing them to PWB", () => {
		const config = readListingCollectionConfig({ source: "everything", limit: "50", saleOrRental: "any", bedroomsFrom: "abc" });
		expect(config).toMatchObject({ source: "featured", limit: 6, saleOrRental: "sale", bedroomsFrom: null });
	});

	it("reads select values, which the editor stores as strings", () => {
		const config = readListingCollectionConfig({ source: "newest", limit: "9", saleOrRental: "rental", bedroomsFrom: "3", propertyType: " types.villa " });
		expect(config).toMatchObject({ source: "newest", limit: 9, saleOrRental: "rental", bedroomsFrom: 3, propertyType: "types.villa" });
	});

	it("only keeps slugs for hand-picked collections", () => {
		expect(readListingCollectionConfig({ source: "newest", slugs: "a, b" }).slugs).toEqual([]);
		expect(readListingCollectionConfig({ source: "handpicked", slugs: "a, b" }).slugs).toEqual(["a", "b"]);
	});
});

describe("parseHandpickedSlugs", () => {
	it("accepts slugs, paths and full URLs, de-duplicated in order", () => {
		expect(
			parseHandpickedSlugs("villa-one, /properties/flat-two\nhttps://site.test/es/properties/villa-one?x=1, house-3"),
		).toEqual(["villa-one", "flat-two", "house-3"]);
	});

	it("caps the list at twelve", () => {
		const many = Array.from({ length: 20 }, (_, i) => `p-${i}`).join(",");
		expect(parseHandpickedSlugs(many)).toHaveLength(12);
	});
});

describe("search params and view-all link", () => {
	it("maps filters onto PWB search params", () => {
		const config = readListingCollectionConfig({ source: "featured", saleOrRental: "rental", propertyType: "types.flat", bedroomsFrom: "2", limit: "3" });
		expect(buildCollectionSearchParams(config)).toEqual({
			sale_or_rental: "rental",
			per_page: 3,
			featured: "true",
			property_type: "types.flat",
			bedrooms_from: "2",
		});
	});

	it("links to matching search results in the current locale", () => {
		const config = readListingCollectionConfig({ source: "newest", saleOrRental: "rental", propertyType: "types.flat", bedroomsFrom: "2" });
		expect(buildCollectionViewAllHref(config, "es")).toBe("/es/properties?mode=rental&type=types.flat&bedrooms=2");
		expect(buildCollectionViewAllHref(readListingCollectionConfig({}), "en")).toBe("/properties");
	});

	it("has no view-all link for hand-picked sets", () => {
		expect(buildCollectionViewAllHref(readListingCollectionConfig({ source: "handpicked", slugs: "a" }), "en")).toBeNull();
	});
});

describe("fetchListingCollection", () => {
	it("returns featured listings when there are enough", async () => {
		const { impl, calls } = stubFetch([[(u) => u.pathname.endsWith("/properties"), () => ({ body: { data: [listing("a"), listing("b")] } })]]);
		const config = readListingCollectionConfig({ source: "featured", limit: "3" });

		const result = await fetchListingCollection(impl, API, config, "en");

		expect(result.map((l) => l.slug)).toEqual(["a", "b"]);
		expect(calls).toHaveLength(1);
		expect(calls[0].searchParams.get("featured")).toBe("true");
	});

	it("tops up a sparse featured set with newest listings, without duplicates", async () => {
		const { impl, calls } = stubFetch([
			[(u) => u.searchParams.get("featured") === "true", () => ({ body: { data: [listing("a")] } })],
			[(u) => u.pathname.endsWith("/properties"), () => ({ body: { data: [listing("a"), listing("b"), listing("c"), listing("d")] } })],
		]);
		const config = readListingCollectionConfig({ source: "featured", limit: "3", saleOrRental: "rental" });

		const result = await fetchListingCollection(impl, API, config, "en");

		expect(result.map((l) => l.slug)).toEqual(["a", "b", "c"]);
		expect(calls[1].searchParams.get("featured")).toBeNull();
		expect(calls[1].searchParams.get("sale_or_rental")).toBe("rental");
	});

	it("loads hand-picked listings in order and drops missing ones", async () => {
		const { impl } = stubFetch([
			[(u) => u.pathname.endsWith("/properties/one"), () => ({ body: listing("one") })],
			[(u) => u.pathname.endsWith("/properties/three"), () => ({ body: listing("three") })],
		]);
		const config = readListingCollectionConfig({ source: "handpicked", slugs: "three, gone, one" });

		const result = await fetchListingCollection(impl, API, config, "fr");

		expect(result.map((l) => l.slug)).toEqual(["three", "one"]);
		expect(impl.mock.calls[0][0]).toContain("/api_public/v1/fr/properties/three");
	});

	it("surfaces PWB errors so the block can show an unavailable state", async () => {
		const { impl } = stubFetch([[() => true, () => ({ status: 503, body: {} })]]);
		await expect(fetchListingCollection(impl, API, readListingCollectionConfig({}), "en")).rejects.toThrow("503");
	});
});

describe("fetchPropertyTypeOptions", () => {
	it("turns facet keys into labelled options, keeping the raw key as the value", async () => {
		const { impl } = stubFetch([
			[(u) => u.pathname.endsWith("/search/facets"), () => ({ body: { property_types: { "types.country_house": 1, villa: 2 } } })],
		]);

		expect(await fetchPropertyTypeOptions(impl, API)).toEqual([
			{ id: "types.country_house", name: "Country house" },
			{ id: "villa", name: "Villa" },
		]);
	});
});
