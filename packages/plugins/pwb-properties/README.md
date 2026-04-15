# pwb-properties

EmDash plugin — browse your PropertyWebBuilder listings from the EmDash admin UI.

## What it does

- Adds a **Properties** page to the EmDash admin panel with paginated property listings from the PWB Rails backend.
- Adds a **Search & Listings** settings page to configure the PWB API URL from the admin UI (alternative to the `PWB_API_URL` environment variable).
- Supports filtering by sale / rental / all.
- Provides a property detail view directly inside the admin UI with a "View on site" deep-link.

## Configuration

The plugin stores the API URL in EmDash KV under `settings:pwbApiUrl`. It falls back to the `PWB_API_URL` environment variable configured in `astro.config.ts` / `wrangler.jsonc`.

To configure from the admin UI:
1. Open **Admin → Plugins → Properties → Search & Listings**
2. Enter your PWB API base URL (e.g. `https://yourdomain.com`)
3. Click **Save**

## EmDash hooks used

None — this plugin is admin-UI-only and does not hook into the content pipeline.

## Capabilities required

- `network:fetch:any` — fetches property data from the PWB public API

## Registration

```js
// astro.config.ts
import { pwbPropertiesPlugin } from 'pwb-properties'

emdash({
  plugins: [pwbPropertiesPlugin(), ...],
})
```

This plugin runs in `standard` format (trusted — has full network access). Register it in the `trustedPlugins` array in `astro.config.ts`, not in `bundledPlugins`.
