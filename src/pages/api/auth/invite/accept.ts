import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = ({ request }) => {
	const incoming = new URL(request.url);
	const target = new URL("/_emdash/api/auth/invite/accept", incoming);
	target.search = incoming.search;
	return fetch(new Request(target, request));
};
