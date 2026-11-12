/**
 * Compatibility aliases for invite links and calls made before EmDash moved its
 * auth API under /_emdash (src/pages/api/auth/invite/*).
 *
 * They redirect rather than proxy: a 307 keeps the method and body, and the
 * browser makes the request itself. Proxying with fetch() made a Worker
 * subrequest to the site's own URL, which carried the Worker's address
 * instead of the visitor's.
 */
export function inviteAliasRedirect(request: Request, targetPath: string): Response {
	const incoming = new URL(request.url);
	const target = new URL(targetPath, incoming);
	target.search = incoming.search;
	return new Response(null, { status: 307, headers: { Location: `${target.pathname}${target.search}` } });
}
