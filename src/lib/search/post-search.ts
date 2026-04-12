import { extractText } from "../../utils/reading-time";

export interface SearchablePost {
	data: {
		title?: string | null;
		excerpt?: string | null;
		content?: unknown;
	};
}

/**
 * Returns true if the post's title, excerpt, or body text contains the query
 * (case-insensitive). Returns false for empty queries.
 */
export function matchesQuery(post: SearchablePost, q: string): boolean {
	if (!q) return false;
	const lower = q.toLowerCase();
	const title = (post.data.title || "").toLowerCase();
	const excerpt = (post.data.excerpt || "").toLowerCase();
	const content = extractText(post.data.content).toLowerCase();
	return title.includes(lower) || excerpt.includes(lower) || content.includes(lower);
}

/**
 * Builds a localised search-results summary string.
 * Returns null when there is no active query.
 */
export function buildSearchSummary(
	query: string,
	resultCount: number,
	locale: string,
): string | null {
	if (!query) return null;

	if (locale === "es") {
		return resultCount === 0
			? `No hay resultados para "${query}"`
			: `${resultCount} resultado${resultCount === 1 ? "" : "s"} para "${query}"`;
	}
	if (locale === "fr") {
		return resultCount === 0
			? `Aucun resultat pour "${query}"`
			: `${resultCount} resultat${resultCount === 1 ? "" : "s"} pour "${query}"`;
	}
	return resultCount === 0
		? `No results for "${query}"`
		: `${resultCount} result${resultCount === 1 ? "" : "s"} for "${query}"`;
}
