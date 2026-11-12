import { describe, expect, it } from "vitest";
import { GET as accept } from "../pages/api/auth/invite/accept";
import { POST as complete } from "../pages/api/auth/invite/complete";
import { POST as invite } from "../pages/api/auth/invite/index";

// The aliases used to proxy with fetch() to the site's own URL; now they redirect.
describe("invite alias routes", () => {
	it("redirects an old accept link to EmDash with its token", async () => {
		const response = await accept({ request: new Request("https://site.test/api/auth/invite/accept?token=abc&x=1") } as never);
		expect(response.status).toBe(307);
		expect(response.headers.get("Location")).toBe("/_emdash/api/auth/invite/accept?token=abc&x=1");
	});

	it("redirects POSTs with 307 so the method and body are kept", async () => {
		const init = { method: "POST", body: "{}" };
		const created = await invite({ request: new Request("https://site.test/api/auth/invite", init) } as never);
		const completed = await complete({ request: new Request("https://site.test/api/auth/invite/complete", init) } as never);
		expect([created.status, created.headers.get("Location")]).toEqual([307, "/_emdash/api/auth/invite"]);
		expect([completed.status, completed.headers.get("Location")]).toEqual([307, "/_emdash/api/auth/invite/complete"]);
	});
});
