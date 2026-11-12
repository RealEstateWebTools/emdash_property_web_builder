import type { APIRoute } from "astro";
import { getListingSource } from "../lib/listings/source";
import { DEFAULT_LOCALE } from "../lib/locale";

export const prerender = false;

/** `<lastmod>` for a listing, or '' when its date is missing or unparseable. */
function lastmod(updatedAt: string | null | undefined): string {
	if (!updatedAt) return "";
	const date = new Date(updatedAt);
	return Number.isNaN(date.getTime()) ? "" : `<lastmod>${date.toISOString().split("T")[0]}</lastmod>`;
}

function escapeXml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

export const GET: APIRoute = async ({ url, cache }) => {
	const siteUrl = url.origin;
	const urls: string[] = [];
	let failed = false;

	try {
		const client = getListingSource(DEFAULT_LOCALE, (hint) => cache?.set(hint));
		// Search defaults to sale listings, so walk both modes; a listing can be
		// in both, hence the de-duplication. Cap at 10 pages (1000) per mode.
		const perPage = 100;
		const seen = new Set<string>();

		for (const mode of ["sale", "rental"] as const) {
			let page = 1;
			let totalPages = 1;
			do {
				const results = await client.searchProperties({ sale_or_rental: mode, page, per_page: perPage }, { markers: false });
				totalPages = results.meta.total_pages;

				for (const property of results.data) {
					if (seen.has(property.slug)) continue;
					seen.add(property.slug);
					const loc = `${siteUrl}/properties/${encodeURIComponent(property.slug)}`;
					urls.push(
						`  <url><loc>${escapeXml(loc)}</loc>${lastmod(property.updated_at)}<changefreq>weekly</changefreq><priority>0.8</priority></url>`,
					);
				}

				page++;
			} while (page <= totalPages && page <= 10);
		}
	} catch (err) {
		// If the listing source is unavailable, return an empty sitemap rather
		// than a 500 — but don't let caches keep that empty answer for an hour.
		failed = true;
		console.error("[sitemap-properties] listing source unavailable:", err);
	}

	const xml = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...urls,
		"</urlset>",
	].join("\n");

	return new Response(xml, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": failed ? "no-store" : "public, max-age=3600",
		},
	});
};
