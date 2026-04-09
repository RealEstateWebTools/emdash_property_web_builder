import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = ({ request }) => {
	const target = new URL("/_emdash/api/auth/invite", request.url);
	return fetch(new Request(target, request));
};
