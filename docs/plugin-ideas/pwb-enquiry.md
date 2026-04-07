# Plugin Idea: Property Enquiry Plugin

**New plugin:** `pwb-enquiry`
**Pattern:** Mirrors `pwb-valuation` exactly — public API route + plugin storage + injected Astro page
**Effort:** Medium — new plugin package, same structure as `pwb-valuation`

---

## Problem

The valuation form (`pwb-valuation`) captures generic property valuation requests. But
the more common lead-generation flow on a property site is a buyer or renter making an
enquiry about a *specific* listing. There is currently no way for a visitor to submit
an enquiry that captures the property slug alongside their contact details.

---

## How It Differs from `pwb-valuation`

| | `pwb-valuation` | `pwb-enquiry` |
|---|---|---|
| Intent | "Value my property" | "I'm interested in this property" |
| Property context | None | Captures `propertySlug` + `propertyTitle` |
| Entry point | Standalone `/valuation` page | Embedded on `/properties/:slug` page or standalone `/enquiry?slug=...` |
| Admin table | Generic list | Grouped by property slug |
| Forward to PWB | Not yet | Forward to PWB leads API (optional) |

---

## Plugin Package Structure

```
packages/plugins/pwb-enquiry/
├── package.json
├── tsconfig.json
└── src/
    ├── index.js          # Plugin descriptor
    ├── sandbox-entry.js  # Runtime: routes + hooks
    ├── integration.js    # Astro route injection
    └── pages/
        └── enquiry.astro # Injected /enquiry page
```

---

## Plugin Descriptor (`index.js`)

```js
export function pwbEnquiryPlugin() {
  return {
    id: "pwb-enquiry",
    version: "0.1.0",
    format: "standard",
    entrypoint: "pwb-enquiry/sandbox",
    options: {},
    capabilities: ["network:fetch:any"], // optional: for forwarding to PWB leads API
    storage: {
      enquiries: {
        indexes: ["propertySlug", "email", "status", "createdAt"],
      },
    },
    adminPages: [
      { path: "/", label: "Enquiries", icon: "inbox" },
    ],
  };
}
```

---

## Sandbox Entry (`sandbox-entry.js`)

```js
import { definePlugin } from "emdash";

export default definePlugin({
  routes: {
    // Public: receives form submissions from the property page or /enquiry
    submit: {
      public: true,
      handler: async (routeCtx, ctx) => {
        const body = routeCtx.input ?? {};

        const name = typeof body.name === "string" ? body.name.trim() : "";
        const email = typeof body.email === "string" ? body.email.trim() : "";
        const phone = typeof body.phone === "string" ? body.phone.trim() : "";
        const message = typeof body.message === "string" ? body.message.trim() : "";
        const propertySlug = typeof body.propertySlug === "string" ? body.propertySlug.trim() : "";
        const propertyTitle = typeof body.propertyTitle === "string" ? body.propertyTitle.trim() : "";

        if (!name || !email) {
          throw new Response(
            JSON.stringify({ error: "name and email are required" }),
            { status: 422, headers: { "Content-Type": "application/json" } },
          );
        }

        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await ctx.storage.enquiries.put(id, {
          name,
          email,
          phone,
          message,
          propertySlug,
          propertyTitle,
          status: "new",
          createdAt: new Date().toISOString(),
        });

        ctx.log.info("pwb-enquiry: new enquiry submitted", { id, email, propertySlug });

        // Optional: forward to PWB leads API if configured
        // const pwbApiUrl = await ctx.kv.get("settings:pwbApiUrl");
        // if (pwbApiUrl) { await forwardToPwb(ctx, pwbApiUrl, { name, email, ... }); }

        return { success: true, id };
      },
    },

    // Admin-only: Block Kit UI for the admin dashboard
    admin: {
      handler: async (routeCtx, ctx) => {
        const interaction = routeCtx.input ?? {};
        const filterSlug = typeof interaction.state === "string" ? interaction.state : "";

        const queryOptions = {
          orderBy: { createdAt: "desc" },
          limit: 50,
        };
        if (filterSlug) {
          queryOptions.where = { propertySlug: filterSlug };
        }

        const result = await ctx.storage.enquiries.query(queryOptions);

        const rows = result.items.map((item) => ({
          name: item.data.name ?? "—",
          email: item.data.email ?? "—",
          phone: item.data.phone ?? "—",
          property: item.data.propertyTitle || item.data.propertySlug || "—",
          status: item.data.status ?? "new",
          createdAt: item.data.createdAt ?? "—",
        }));

        const newCount = result.items.filter((i) => i.data.status === "new").length;

        return {
          blocks: [
            { type: "header", text: "Property Enquiries" },
            {
              type: "stats",
              items: [
                { label: "Total", value: String(result.items.length) },
                { label: "New", value: String(newCount) },
              ],
            },
            { type: "divider" },
            result.items.length === 0
              ? { type: "section", text: "No enquiries yet." }
              : {
                  type: "table",
                  columns: [
                    { key: "name", label: "Name", format: "text" },
                    { key: "email", label: "Email", format: "text" },
                    { key: "property", label: "Property", format: "text" },
                    { key: "status", label: "Status", format: "badge" },
                    { key: "createdAt", label: "Submitted", format: "relative_time" },
                  ],
                  rows,
                },
          ],
        };
      },
    },

    // Admin-only: raw JSON for external integrations
    list: {
      handler: async (_routeCtx, ctx) => {
        const result = await ctx.storage.enquiries.query({
          orderBy: { createdAt: "desc" },
          limit: 100,
        });
        return {
          items: result.items.map((i) => ({ id: i.id, ...i.data })),
          hasMore: result.hasMore,
        };
      },
    },
  },
});
```

---

## Injected `/enquiry` Page

The Astro integration follows the same virtual-module pattern as `pwb-valuation`.
The enquiry page can be reached two ways:

1. **Standalone**: `/enquiry?slug=beautiful-villa-marbella` — linked from property cards
2. **Embedded**: a small inline form rendered directly on the property detail page via
   a `<script>` fetch to the submit endpoint

The standalone approach requires no changes to the property pages. The form prefills
the property slug and title from the URL query string.

```astro
---
// src/pages/enquiry.astro (injected by integration)
const slug = Astro.url.searchParams.get("slug") ?? "";
const title = Astro.url.searchParams.get("title") ?? "";
const sent = Astro.url.searchParams.get("sent") === "1";

if (Astro.request.method === "POST") {
  const formData = await Astro.request.formData();
  const body = {
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    message: formData.get("message"),
    propertySlug: formData.get("propertySlug"),
    propertyTitle: formData.get("propertyTitle"),
  };
  const res = await fetch(new URL("/_emdash/api/plugins/pwb-enquiry/submit", Astro.url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.ok) {
    return Astro.redirect(`/enquiry?slug=${slug}&sent=1`);
  }
}
---
<BaseLayout title={`Enquire about ${title || "this property"}`}>
  {sent
    ? <p>Thank you — we'll be in touch shortly.</p>
    : <form method="POST">
        <input type="hidden" name="propertySlug" value={slug} />
        <input type="hidden" name="propertyTitle" value={title} />
        <!-- name, email, phone, message fields -->
      </form>
  }
</BaseLayout>
```

---

## `astro.config.mjs` Registration

```js
import { pwbEnquiryPlugin } from "pwb-enquiry";
import { pwbEnquiryIntegration } from "pwb-enquiry/integration";

// In trustedPlugins (it needs network:fetch for optional PWB forwarding):
const trustedPlugins = [webhookNotifierPlugin(), pwbPropertiesPlugin(), pwbEnquiryPlugin()];

// In integrations:
pwbEnquiryIntegration({ layout: "./src/layouts/BaseLayout.astro" }),
```

---

## Linking from Property Pages

On the property detail page (`/properties/[slug]`), add an enquiry CTA:

```astro
<a href={`/enquiry?slug=${property.slug}&title=${encodeURIComponent(property.title)}`}>
  Enquire about this property
</a>
```

---

## Optional: Forward to PWB Leads API

When the PWB Rails backend has a leads endpoint, add forwarding inside the `submit`
handler:

```js
const pwbApiUrl = await ctx.kv.get("settings:pwbApiUrl");
if (pwbApiUrl) {
  await ctx.http.fetch(`${pwbApiUrl}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, phone, message, property_slug: propertySlug }),
  });
}
```

This requires the `settings:pwbApiUrl` key to be shared with `pwb-properties` — or the
enquiry plugin can have its own settings for the PWB URL. The simplest approach is to
read from the same key if both plugins share the same EmDash instance.

---

## Testing

1. Register the plugin. Navigate to `/enquiry?slug=some-slug&title=Some+Title`.
2. Submit the form and confirm redirect to `?sent=1`.
3. Open the admin → Enquiries — confirm the row appears with correct property slug.
4. Submit without a name — confirm 422 error is shown.
5. Check the raw JSON at `/_emdash/api/plugins/pwb-enquiry/list` (admin token required).
