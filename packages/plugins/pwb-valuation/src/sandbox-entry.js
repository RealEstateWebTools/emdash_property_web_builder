/**
 * EmDash plugin runtime for pwb-valuation.
 *
 * Handles:
 *   - POST /_emdash/api/plugins/pwb-valuation/submit  (public)
 *   - GET  /_emdash/api/plugins/pwb-valuation/list    (admin-only)
 *   - POST /_emdash/api/plugins/pwb-valuation/admin   (Block Kit admin UI)
 */

import { definePlugin } from "emdash";

export function buildValuationRows(items) {
  return items.map((item) => ({
    name: item.data.name ?? "—",
    email: item.data.email ?? "—",
    phone: item.data.phone ?? "—",
    address: item.data.address ?? "—",
    status: item.data.status ?? "new",
    createdAt: item.data.createdAt ?? "—",
  }));
}

export function buildListBlocks(result) {
  if (result.items.length === 0) {
    return [
      { type: "header", text: "Valuation Requests" },
      { type: "section", text: "No valuation requests yet." },
    ];
  }

  return [
    { type: "header", text: "Valuation Requests" },
    {
      type: "stats",
      items: [
        { label: "Total", value: String(result.items.length) },
        {
          label: "New",
          value: String(result.items.filter((i) => i.data.status === "new").length),
        },
      ],
    },
    { type: "divider" },
    {
      type: "table",
      blockId: "valuations-table",
      columns: [
        { key: "name", label: "Name", format: "text" },
        { key: "email", label: "Email", format: "text" },
        { key: "address", label: "Address", format: "text" },
        { key: "status", label: "Status", format: "badge" },
        { key: "createdAt", label: "Submitted", format: "relative_time" },
      ],
      rows: buildValuationRows(result.items),
    },
  ];
}

export default definePlugin({
  routes: {
    // Public: called by the injected /valuation page on form submit
    submit: {
      public: true,
      handler: async (routeCtx, ctx) => {
        // EmDash pre-parses the POST body into routeCtx.input — do not call
        // routeCtx.request.json() as the body stream will already be consumed.
        const body = routeCtx.input ?? {};

        const name = typeof body.name === "string" ? body.name.trim() : "";
        const email = typeof body.email === "string" ? body.email.trim() : "";
        const phone = typeof body.phone === "string" ? body.phone.trim() : "";
        const address = typeof body.address === "string" ? body.address.trim() : "";
        const notes = typeof body.notes === "string" ? body.notes.trim() : "";

        if (!name || !email || !address) {
          throw new Response(
            JSON.stringify({ error: "name, email, and address are required" }),
            { status: 422, headers: { "Content-Type": "application/json" } },
          );
        }

        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await ctx.storage.valuations.put(id, {
          name,
          email,
          phone,
          address,
          notes,
          status: "new",
          createdAt: new Date().toISOString(),
        });

        ctx.log.info("pwb-valuation: new request submitted", { id, email });
        return { success: true, id };
      },
    },

    // Admin-only: raw JSON list for external tooling or future integrations
    list: {
      handler: async (_routeCtx, ctx) => {
        const result = await ctx.storage.valuations.query({
          orderBy: { createdAt: "desc" },
          limit: 100,
        });
        return {
          items: result.items.map((item) => ({ id: item.id, ...item.data })),
          hasMore: result.hasMore,
        };
      },
    },

    // Block Kit handler for the admin UI page
    admin: {
      handler: async (_routeCtx, ctx) => {
        const result = await ctx.storage.valuations.query({
          orderBy: { createdAt: "desc" },
          limit: 50,
        });
        return { blocks: buildListBlocks(result) };
      },
    },
  },
});
