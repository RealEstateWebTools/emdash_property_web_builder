import { describe, expect, it, vi } from "vitest";

import {
	fetchPropertyBySlug,
	getPropertiesPath,
	getPropertyUrl,
	normalizeLocale,
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
	});

	it("translates embed chrome labels for supported locales", () => {
		expect(translateEmbedLabel("es", "View Property")).toBe("Ver propiedad");
		expect(translateEmbedLabel("fr", "Featured Property")).toBe("Bien en vedette");
		expect(translateEmbedLabel("en", "View Property")).toBe("View Property");
		expect(translateEmbedLabel("es", "Unmapped label")).toBe("Unmapped label");
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
});