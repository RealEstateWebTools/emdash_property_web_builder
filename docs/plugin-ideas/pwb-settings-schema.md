# Plugin Idea: Simplify `pwb-properties` Settings with `settingsSchema`

**Target plugin:** `pwb-properties`
**API used:** `admin.settingsSchema` in `definePlugin()`
**Effort:** Low — a refactor, no new features

---

## Problem

The `pwb-properties` settings page is implemented as ~35 lines of hand-built Block Kit
(in `buildSettingsBlocks()`), including a custom `save_settings` action handler and
manual KV writes. This is more code than the feature warrants, and the hand-built form
will look inconsistent if EmDash updates its settings UI styling.

The docs describe `admin.settingsSchema` which auto-generates a settings form from a
JSON schema. The auto-generated form:

- Handles rendering automatically (consistent with other plugins)
- Handles save/cancel UI automatically
- Persists values under `settings:` KV keys automatically
- Requires zero custom handler code for the settings interaction

---

## Current vs. Proposed

**Current implementation (sandbox-entry.js):**

- `buildSettingsBlocks()` — 35-line function building a hand-rolled Block Kit form
- `save_settings` branch in the `admin` route handler — validates, calls `ctx.kv.set`
- `/settings` branch in the `admin` route handler — calls `buildSettingsBlocks()`

Total settings-related code: ~70 lines.

**Proposed (with `settingsSchema`):**

- Remove `buildSettingsBlocks()` entirely
- Remove the `save_settings` and `/settings` branches from the admin handler
- Add `settingsSchema` to the `definePlugin()` call
- Remove the `/settings` page from `adminPages` (the framework generates it)

Total settings-related code: ~5 lines.

---

## Implementation

### 1. Remove the hand-built settings form from `sandbox-entry.js`

Delete:
- `buildSettingsBlocks()`
- The `if (interaction.action_id === "save_settings")` branch
- The `if (currentPage === "/settings")` branch

### 2. Add `settingsSchema` to `definePlugin()`

```js
export default definePlugin({
  admin: {
    settingsSchema: {
      pwbApiUrl: {
        type: "string",
        label: "PWB API URL",
        description:
          "Base URL of your PWB Rails backend. No trailing slash. Example: https://example.com",
        default: "",
      },
    },
  },

  routes: {
    admin: {
      handler: async (routeCtx, ctx) => {
        // Settings page and save are now fully handled by the framework.
        // The admin handler only needs to handle list/detail/filter interactions.
        const interaction = routeCtx.input ?? {};
        // ... existing list/detail/filter logic, unchanged ...
      },
    },
  },
});
```

### 3. Remove the `/settings` page from `adminPages` in `index.js`

```js
adminPages: [
  { path: "/", label: "Properties", icon: "list" },
  // Remove: { path: "/settings", label: "Settings", icon: "settings" },
],
```

The framework adds a Settings link automatically when `settingsSchema` is present.

### 4. Keep the same KV key

`settingsSchema` persists values under `settings:<fieldKey>`. The field key `pwbApiUrl`
maps to `settings:pwbApiUrl` — exactly the same key the current code uses:

```js
const SETTINGS_KEY = "settings:pwbApiUrl";
```

This means the migration is backward-compatible. Any existing value stored by the
current hand-built form is automatically read by the new `settingsSchema`-based form.

### 5. Keep `getConfiguredApiUrl()` unchanged

The runtime reader already uses:

```js
const stored = await ctx.kv.get(SETTINGS_KEY); // "settings:pwbApiUrl"
```

No change needed here.

---

## Before and After

**Before:** custom `save_settings` handler + `buildSettingsBlocks()`

```
Plugin admin route receives save_settings action
→ validateApiUrl(candidateUrl)
→ ctx.kv.set("settings:pwbApiUrl", validation.value)
→ return { blocks: buildSettingsBlocks(validation.value), toast: { ... } }
```

**After:** framework handles save, plugin reads the persisted value

```
Framework receives settings form submission
→ persists to ctx.kv under "settings:pwbApiUrl"
→ shows success/error toast automatically
Plugin reads ctx.kv.get("settings:pwbApiUrl") as before
```

---

## What Is Lost

- **Custom validation**: the current code validates that the input is a parseable
  `http`/`https` URL. `settingsSchema` `type: "string"` has no URL-specific validation.
  Options:
  - Accept the loss — an invalid URL will simply fail at fetch time with a clear error.
  - Add a `pattern` regex to the schema if the framework supports it.
  - Keep a lightweight `content:beforeSave`-style hook that validates on use, not on save.

- **Trim/normalize on save**: the current code calls `trimTrailingSlash()` before
  persisting. With `settingsSchema`, the raw value is stored. Move the trimming into
  `getConfiguredApiUrl()` instead (it already trims, just add `trimTrailingSlash` there).

---

## Testing

1. Apply the change and reload the admin.
2. Navigate to Properties → Settings — confirm a generated settings form appears with
   the PWB API URL field.
3. Save a valid URL — confirm the Properties list page now loads correctly.
4. Re-open Settings — confirm the saved URL appears pre-filled in the form.
5. Verify `ctx.kv.get("settings:pwbApiUrl")` returns the expected value
   (check via Properties list — if it loads, the key is being read correctly).
