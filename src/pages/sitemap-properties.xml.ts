import type { APIRoute } from "astro";
import { getListingSource } from "../lib/listings/source";
import { DEFAULT_LOCALE } from "../lib/locale";

export const prerender = false;

function escapeXml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

export const GET: APIRoute = async ({ url }) => {
	const siteUrl = url.origin;
	const urls: string[] = [];

	try {
		const client = getListingSource(DEFAULT_LOCALE);
		// Search defaults to sale listings, so walk both modes; a listing can be
		// in both, hence the de-duplication. Cap at 10 pages (1000) per mode.
		const perPage = 100;
		const seen = new Set<string>();

		for (const mode of ["sale", "rental"] as const) {
			let page = 1;
			let totalPages = 1;
			do {
				const results = await client.searchProperties({ sale_or_rental: mode, page, per_page: perPage });
				totalPages = results.meta.total_pages;

				for (const property of results.data) {
					if (seen.has(property.slug)) continue;
					seen.add(property.slug);
					const loc = `${siteUrl}/properties/${encodeURIComponent(property.slug)}`;
					const lastmod = property.updated_at
						? `<lastmod>${new Date(property.updated_at).toISOString().split('T')[0]}</lastmod>`
						: ''
					urls.push(
						`  <url><loc>${escapeXml(loc)}</loc>${lastmod}<changefreq>weekly</changefreq><priority>0.8</priority></url>`,
					)
				}

				page++;
			} while (page <= totalPages && page <= 10);
		}
	} catch {
		// If the listing source is unavailable, return an empty sitemap rather than a 500
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
			"Cache-Control": "public, max-age=3600",
		},
	});
};
