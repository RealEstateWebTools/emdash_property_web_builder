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
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce({ status: 404, ok: false })
			.mockResolvedValueOnce({
				status: 200,
				ok: true,
				json: async () => ({ slug: "villa-marbella", title: "Villa Marbella" }),
			});

		const property = await fetchPropertyBySlug(fetchImpl, "https://example.com", "villa-marbella", "es");

		expect(fetchImpl).toHaveBeenCalledTimes(2);
		expect(fetchImpl).toHaveBeenNthCalledWith(
			1,
			"https://example.com/api_public/v1/es/properties/villa-marbella",
			{ headers: { Accept: "application/json" } },
		);
		expect(fetchImpl).toHaveBeenNthCalledWith(
			2,
			"https://example.com/api_public/v1/en/properties/villa-marbella",
			{ headers: { Accept: "application/json" } },
		);
		expect(property).toEqual({ slug: "villa-marbella", title: "Villa Marbella" });
	});

	it("does not mask non-404 upstream failures", async () => {
		const fetchImpl = vi.fn().mockResolvedValue({ status: 500, ok: false });

		await expect(fetchPropertyBySlug(fetchImpl, "https://example.com", "villa-marbella", "fr")).rejects.toThrow(
			"Failed to load PWB property villa-marbella: 500",
		);
		expect(fetchImpl).toHaveBeenCalledTimes(1);
	});

	it("builds a featured property shortlist for editor quick-picks", async () => {
		const fetchImpl = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				data: [
					{
						slug: "villa-marbella",
						title: "Villa Marbella",
						formatted_price: "€2,450,000",
						reference: "PWB-42",
					},
				],
			}),
		});

		await expect(fetchPropertyOptions(fetchImpl, "https://example.com", "es")).resolves.toEqual([
			{ id: "villa-marbella", name: "Villa Marbella (€2,450,000 • PWB-42)" },
		]);
		expect(fetchImpl).toHaveBeenCalledWith(
			expect.stringContaining("https://example.com/api_public/v1/es/properties?featured=true&per_page=12"),
			{ headers: { Accept: "application/json" } },
		);
	});

	it("falls back to a general property list when no featured shortlist is available", async () => {
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					data: [{ slug: "casa-nueva", title: "Casa Nueva", formatted_price: null, reference: null }],
				}),
			});

		await expect(fetchPropertyOptions(fetchImpl, "https://example.com", "fr")).resolves.toEqual([
			{ id: "casa-nueva", name: "Casa Nueva" },
		]);
		expect(fetchImpl).toHaveBeenCalledTimes(2);
		expect(fetchImpl).toHaveBeenNthCalledWith(
			2,
			expect.stringContaining("https://example.com/api_public/v1/fr/properties?per_page=12"),
			{ headers: { Accept: "application/json" } },
		);
	});
});