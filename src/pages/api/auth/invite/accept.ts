import type { APIRoute } from "astro";
import { inviteAliasRedirect } from "../../../../lib/invite-aliases";

export const prerender = false;

export const GET: APIRoute = ({ request }) => inviteAliasRedirect(request, "/_emdash/api/auth/invite/accept");
