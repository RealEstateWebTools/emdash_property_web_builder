import { describe, it, expect } from "vitest";
import { matchesQuery, buildSearchSummary } from "./post-search";

const makePost = (overrides: {
	title?: string;
	excerpt?: string;
	content?: unknown;
} = {}) => ({
	data: {
		title: overrides.title ?? "Default Title",
		excerpt: overrides.excerpt ?? null,
		content: overrides.content ?? null,
	},
});

describe("matchesQuery", () => {
	it("returns false for empty query", () => {
		expect(matchesQuery(makePost({ title: "Hello World" }), "")).toBe(false);
	});

	it("matches by title (case-insensitive)", () => {
		expect(matchesQuery(makePost({ title: "How to Buy a Villa" }), "villa")).toBe(true);
		expect(matchesQuery(makePost({ title: "How to Buy a Villa" }), "VILLA")).toBe(true);
	});

	it("matches by excerpt", () => {
		expect(matchesQuery(makePost({ excerpt: "Great sea views" }), "sea views")).toBe(true);
	});

	it("returns false when query not found anywhere", () => {
		expect(
			matchesQuery(
				makePost({ title: "Beach House", excerpt: "Lovely property" }),
				"mountain",
			),
		).toBe(false);
	});

	it("matches by portable-text content blocks", () => {
		const content = [
			{ _type: "block", _key: "a", children: [{ _type: "span", text: "investment opportunity" }] },
		];
		expect(matchesQuery(makePost({ content }), "investment")).toBe(true);
	});

	it("does not match portable-text metadata keys like _type", () => {
		const content = [{ _type: "specialBlock", _key: "x" }];
		// "_type" is an internal key — searching for "specialBlock" should NOT match
		// because extractText only returns the text content of spans
		expect(matchesQuery(makePost({ content }), "specialblock")).toBe(false);
	});
});

describe("buildSearchSummary", () => {
	it("returns null for empty query", () => {
		expect(buildSearchSummary("", 5, "en")).toBeNull();
	});

	describe("English", () => {
		it("shows singular result", () => {
			expect(buildSearchSummary("villa", 1, "en")).toBe('1 result for "villa"');
		});

		it("shows plural results", () => {
			expect(buildSearchSummary("villa", 3, "en")).toBe('3 results for "villa"');
		});

		it("shows no results", () => {
			expect(buildSearchSummary("xyz", 0, "en")).toBe('No results for "xyz"');
		});
	});

	describe("Spanish", () => {
		it("shows singular result", () => {
			expect(buildSearchSummary("villa", 1, "es")).toBe('1 resultado para "villa"');
		});

		it("shows plural results", () => {
			expect(buildSearchSummary("villa", 4, "es")).toBe('4 resultados para "villa"');
		});

		it("shows no results", () => {
			expect(buildSearchSummary("xyz", 0, "es")).toBe('No hay resultados para "xyz"');
		});
	});

	describe("French", () => {
		it("shows singular result", () => {
			expect(buildSearchSummary("villa", 1, "fr")).toBe('1 resultat pour "villa"');
		});

		it("shows plural results", () => {
			expect(buildSearchSummary("villa", 2, "fr")).toBe('2 resultats pour "villa"');
		});

		it("shows no results", () => {
			expect(buildSearchSummary("xyz", 0, "fr")).toBe('Aucun resultat pour "xyz"');
		});
	});

	it("falls back to English for unknown locale", () => {
		expect(buildSearchSummary("test", 1, "de")).toBe('1 result for "test"');
	});
});
