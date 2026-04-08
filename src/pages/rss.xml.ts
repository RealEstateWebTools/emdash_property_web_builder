import type { APIRoute } from "astro";
import { getEmDashCollection } from "emdash";
import { buildRssXml } from "../lib/rss";
import { DEFAULT_LOCALE } from "../lib/locale";

export const GET: APIRoute = async ({ site, url }) => {
	const siteUrl = site?.toString() || url.origin;

	const { entries: posts } = await getEmDashCollection("posts", {
		locale: DEFAULT_LOCALE,
		orderBy: { published_at: "desc" },
		limit: 20,
	});

	const rss = buildRssXml({
		locale: DEFAULT_LOCALE,
		siteUrl,
		selfPath: '/rss.xml',
		posts,
	})

	return new Response(rss, {
		headers: {
			"Content-Type": "application/rss+xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};
