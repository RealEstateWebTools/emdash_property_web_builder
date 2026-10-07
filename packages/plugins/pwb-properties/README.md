# pwb-properties

Browse, filter, and inspect PropertyWebBuilder listings inside the EmDash admin.
Supports EmDash `^1.1.0`. Package version: `0.1.0`.

## Release status

Prepared for local registry build checks; not published or certified for clean-host
sandbox installation. See [the readiness report](../../../docs/plugin-release-readiness.md).
License, author, publisher identity, and security contact still need owner decisions.
The manifest template intentionally contains nulls and is not a release manifest.

## Existing trusted installation

This repository installs the workspace package automatically with `pnpm install`.
Register its descriptor in the host Astro configuration:

```js
import { pwbPropertiesPlugin } from 'pwb-properties';

emdash({
  plugins: [pwbPropertiesPlugin()],
});
```

The descriptor uses `standard` format and this site's `plugins` array executes it
in the host process. This trusted installation is not isolated. The package uses
Block Kit and needs no React admin code or Astro rendering components.

## Configuration

Open **Properties → Search & Listings**, enter the public PWB API base URL, and
save. The API URL is stored in plugin KV under `settings:pwbApiUrl`; there is no
environment-variable fallback in this plugin. The default is unconfigured.

Use an absolute HTTP(S) URL without embedded credentials, query parameters, or
fragments. Trailing slashes are removed. Sandbox network policy permits public
hosts; local/private PWB hosts may work in trusted development but must be tested
against the selected sandbox runner. Listing requests use English (`en`).

This setting affects only the admin listing browser. The public site's listings
are configured separately by the host's `PWB_API_URL`/listing source.

## Permissions and data

- `network:request:unrestricted`: required because operators choose their PWB host
  at runtime. The sandbox permits requests to public hosts rather than a fixed
  hostname allowlist. `allowedHosts` is empty for this capability.
- KV stores the configured base URL; no plugin-owned storage collection is used.
- No content, media, user, or email capability is requested.
- The `admin` route is authenticated by EmDash; there is no public plugin route.
- API base URLs are not written to runtime logs. Do not put credentials in URLs.

The public API contract is GET `/api_public/v1/en/properties` with `page`,
`per_page=20`, and optional `sale_or_rental`; listing responses contain `data`
and pagination `meta`. Details use GET `/api_public/v1/en/properties/:slug`.
The detail deep-link opens `/properties/:slug` on the configured PWB host.

## Local release preparation

Run these commands from the repository root:

```bash
pnpm run test:run packages/plugins/pwb-properties/src/sandbox-entry.test.js
pnpm run plugin:pwb-properties:verify
```

Verification uses the pinned `@emdash-cms/plugin-cli` to build and bundle a temporary
copy with explicitly fictitious test profile data. It checks archive contents,
permissions, and the bundled runtime, then deletes the temporary artifact. It
uses no account, network API, authentication, or publishing action. The CLI's
unrestricted-network warning is expected and documented above.

For a real locally reviewable artifact, copy `emdash-plugin.jsonc.example` to
`emdash-plugin.jsonc` and replace every null with owner-approved metadata. The
license must be a real SPDX expression; author is an object with `name`; security
is an object with `email` and/or `url`; publisher is an Atmosphere handle or DID.
Keep the version in `package.json` and add the chosen license there too.

Then run from the repository root:

```bash
pnpm run plugin:pwb-properties:validate
pnpm run plugin:pwb-properties:build
pnpm run plugin:pwb-properties:bundle
```

These commands build locally and do not publish. The real manifest is not committed
yet, so they currently fail with a missing-manifest error. Generated files are
in this package's `dist/`. The CLI emits a default descriptor in `dist/index.mjs`
(also exported as `pwb-properties/descriptor` after building), runtime code,
declarations, a wire manifest, and the bundle tarball. Existing hosts can continue
using the named `pwbPropertiesPlugin()` factory.

Registry admin pages use `/properties` and `/settings`; the existing trusted
factory keeps its `/` and `/settings` paths for compatibility. Both use the same
runtime. Installing the exact registry tarball into a disposable, unpatched
EmDash host with a sandbox runner is still a release gate.

## Upgrade and verification

KV key, listing filters, and existing trusted registration remain compatible.
Credential-bearing or query/fragment-bearing saved API URLs now show the setup
message and must be replaced with a clean base URL.

Before public release, verify settings save/reload, sale/rental filters,
previous/next navigation, detail/back links, empty inventory, backend outages,
authentication, and permission enforcement in a real sandboxed host.
