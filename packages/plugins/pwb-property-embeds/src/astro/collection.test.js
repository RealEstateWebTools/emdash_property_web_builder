import { describe, expect, it } from "vitest";
import {
	buildCollectionSearchParams,
	buildCollectionViewAllHref,
	fetchListingCollection,
	fetchPropertyTypeOptions,
	parseHandpickedSlugs,
	readListingCollectionConfig,
} from "./collection.js";


function listing(slug) {
	return { slug, title: slug, formatted_price: "€1", count_bedrooms: 2, count_bathrooms: 1 };
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
	/** A listing source whose search answers by `featured` and records params. */
	function stubSource({ featured = [], all = [], details = {}, error } = {}) {
		const searches = [];
		return {
			searches,
			async searchProperties(params) {
				if (error) throw error;
				searches.push(params);
				return { data: params.featured === "true" ? featured : all };
			},
			async getProperty(slug) {
				if (error) throw error;
				if (details[slug]) return details[slug];
				throw Object.assign(new Error("not found"), { status: 404 });
			},
		};
	}

	it("returns featured listings when there are enough", async () => {
		const source = stubSource({ featured: [listing("a"), listing("b")] });
		const result = await fetchListingCollection(source, readListingCollectionConfig({ source: "featured", limit: "3" }));

		expect(result.map((l) => l.slug)).toEqual(["a", "b"]);
		expect(source.searches).toEqual([{ sale_or_rental: "sale", per_page: 3, featured: "true" }]);
	});

	it("tops up a sparse featured set with newest listings, without duplicates", async () => {
		const source = stubSource({
			featured: [listing("a")],
			all: [listing("a"), listing("b"), listing("c"), listing("d")],
		});
		const config = readListingCollectionConfig({ source: "featured", limit: "3", saleOrRental: "rental" });

		const result = await fetchListingCollection(source, config);

		expect(result.map((l) => l.slug)).toEqual(["a", "b", "c"]);
		expect(source.searches[1]).toEqual({ sale_or_rental: "rental", per_page: 3 });
	});

	it("loads hand-picked listings in order and drops missing ones", async () => {
		const source = stubSource({ details: { one: listing("one"), three: listing("three") } });
		const config = readListingCollectionConfig({ source: "handpicked", slugs: "three, gone, one" });

		const result = await fetchListingCollection(source, config);

		expect(result.map((l) => l.slug)).toEqual(["three", "one"]);
	});

	it("surfaces source errors so the block can show an unavailable state", async () => {
		const source = stubSource({ error: Object.assign(new Error("upstream 503"), { status: 503 }) });
		await expect(fetchListingCollection(source, readListingCollectionConfig({}))).rejects.toThrow("503");
		await expect(
			fetchListingCollection(source, readListingCollectionConfig({ source: "handpicked", slugs: "x" })),
		).rejects.toThrow("503");
	});
});

describe("fetchPropertyTypeOptions", () => {
	it("lists the source's property types, keeping the raw key as the value", async () => {
		const source = {
			async getSearchConfig() {
				return { property_types: [{ key: "types.country_house", label: "Country house" }, { key: "villa", label: "Villa" }] };
			},
		};

		expect(await fetchPropertyTypeOptions(source)).toEqual([
			{ id: "types.country_house", name: "Country house" },
			{ id: "villa", name: "Villa" },
		]);
	});
});
