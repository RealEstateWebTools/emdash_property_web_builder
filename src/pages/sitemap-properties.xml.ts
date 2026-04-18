import type { APIRoute } from "astro";
import { createPwbClient } from "../lib/pwb/client";
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
		const client = createPwbClient(DEFAULT_LOCALE);
		// Fetch up to 1000 properties for the sitemap (multiple pages if needed)
		const perPage = 100;
		let page = 1;
		let totalPages = 1;

		do {
			const results = await client.searchProperties({ page, per_page: perPage });
			totalPages = results.meta.total_pages;

			for (const property of results.data) {
				const loc = `${siteUrl}/properties/${encodeURIComponent(property.slug)}`;
				const lastmod = property.updated_at
					? `<lastmod>${new Date(property.updated_at).toISOString().split('T')[0]}</lastmod>`
					: ''
				urls.push(
					`  <url><loc>${escapeXml(loc)}</loc>${lastmod}<changefreq>weekly</changefreq><priority>0.8</priority></url>`,
				)
			}

			page++;
		} while (page <= totalPages && page <= 10); // cap at 10 pages = 1000 listings
	} catch {
		// If the PWB API is unavailable, return an empty sitemap rather than a 500
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
