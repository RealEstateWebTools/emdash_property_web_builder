import { describe, expect, it, vi } from "vitest";

import {
	fetchPropertyOptions,
	fetchPropertyBySlug,
	getPropertySlugValidationError,
	getPropertiesPath,
	getPropertyUrl,
	normalizeLocale,
	normalizePropertySlug,
	translateEmbedLabel,
} from "../../packages/plugins/pwb-property-embeds/src/astro/pwb.js";

describe("PWB property embed locale helpers", () => {
	it("normalizes unsupported locales back to the default locale", () => {
		expect(normalizeLocale("en")).toBe("en");
		expect(normalizeLocale("es")).toBe("es");
		expect(normalizeLocale("fr")).toBe("fr");
		expect(normalizeLocale("de")).toBe("en");
		expect(normalizeLocale(undefined)).toBe("en");
	});

	it("builds locale-aware property paths", () => {
		expect(getPropertiesPath("en")).toBe("/properties");
		expect(getPropertiesPath("es")).toBe("/es/properties");
		expect(getPropertiesPath("fr")).toBe("/fr/properties");
		expect(getPropertyUrl("villa-marbella", "en")).toBe("/properties/villa-marbella");
		expect(getPropertyUrl("villa-marbella", "es")).toBe("/es/properties/villa-marbella");
		expect(getPropertyUrl("https://example.com/es/properties/villa-marbella", "fr")).toBe(
			"/fr/properties/villa-marbella",
		);
	});

	it("normalizes pasted property URLs and paths back to a canonical slug", () => {
		expect(normalizePropertySlug(" beautiful-villa-marbella ")).toBe("beautiful-villa-marbella");
		expect(normalizePropertySlug("/properties/beautiful-villa-marbella/")).toBe("beautiful-villa-marbella");
		expect(normalizePropertySlug("https://example.com/es/properties/beautiful-villa-marbella?ref=editor")).toBe(
			"beautiful-villa-marbella",
		);
	});

	it("translates embed chrome labels for supported locales", () => {
		expect(translateEmbedLabel("es", "View Property")).toBe("Ver propiedad");
		expect(translateEmbedLabel("fr", "Featured Property")).toBe("Bien en vedette");
		expect(translateEmbedLabel("en", "View Property")).toBe("View Property");
		expect(translateEmbedLabel("es", "Unmapped label")).toBe("Unmapped label");
		expect(translateEmbedLabel("fr", "Property slug is invalid")).toBe("Slug du bien invalide");
	});

	it("flags malformed property slugs before fetch", () => {
		expect(getPropertySlugValidationError("", "en")).toBe("Property slug is missing");
		expect(getPropertySlugValidationError("villa marbella", "en")).toBe("Property slug is invalid");
		expect(getPropertySlugValidationError("villa-marbella", "en")).toBe("");
		expect(getPropertySlugValidationError("https://example.com/properties/villa-marbella", "es")).toBe("");
	});

	it("falls back to the default locale when a localized property is missing", async () => {
		const notFound = Object.assign(new Error("not found"), { status: 404 });
		const getProperty = vi
			.fn()
			.mockRejectedValueOnce(notFound)
			.mockResolvedValueOnce({ slug: "villa-marbella", title: "Villa Marbella" });
		const getSource = vi.fn((_locale: string) => ({ getProperty }));

		const property = await fetchPropertyBySlug(getSource, "villa-marbella", "es");

		expect(getSource.mock.calls.map(([locale]) => locale)).toEqual(["es", "en"]);
		expect(property).toEqual({ slug: "villa-marbella", title: "Villa Marbella" });
	});

	it("returns null when the property exists in no locale", async () => {
		const notFound = Object.assign(new Error("not found"), { status: 404 });
		const getSource = () => ({ getProperty: vi.fn().mockRejectedValue(notFound) });
		await expect(fetchPropertyBySlug(getSource, "gone", "fr")).resolves.toBeNull();
	});

	it("does not mask non-404 upstream failures", async () => {
		const getProperty = vi.fn().mockRejectedValue(Object.assign(new Error("upstream 500"), { status: 500 }));
		const getSource = vi.fn(() => ({ getProperty }));

		await expect(fetchPropertyBySlug(getSource, "villa-marbella", "fr")).rejects.toThrow("upstream 500");
		expect(getProperty).toHaveBeenCalledTimes(1);
	});

	it("builds a featured property shortlist for editor quick-picks", async () => {
		const searchProperties = vi.fn().mockResolvedValue({
			data: [{ slug: "villa-marbella", title: "Villa Marbella", formatted_price: "€2,450,000", reference: "PWB-42" }],
		});

		await expect(fetchPropertyOptions({ searchProperties })).resolves.toEqual([
			{ id: "villa-marbella", name: "Villa Marbella (€2,450,000 • PWB-42)" },
		]);
		expect(searchProperties).toHaveBeenCalledWith({ featured: "true", per_page: 12 });
	});

	it("falls back to a general property list when no featured shortlist is available", async () => {
		const searchProperties = vi
			.fn()
			.mockResolvedValueOnce({ data: [] })
			.mockResolvedValueOnce({ data: [{ slug: "casa-nueva", title: "Casa Nueva", formatted_price: null, reference: null }] });

		await expect(fetchPropertyOptions({ searchProperties })).resolves.toEqual([{ id: "casa-nueva", name: "Casa Nueva" }]);
		expect(searchProperties).toHaveBeenNthCalledWith(2, { per_page: 12 });
	});
});