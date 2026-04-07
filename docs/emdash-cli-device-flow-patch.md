# EmDash CLI Device Flow Patch

This repository carries a local patch against `emdash@0.1.0` that fixes the OAuth
Device Flow login when connecting the CLI to a remote EmDash instance.

Without this patch, `npx emdash login --url <remote>` prints `undefined` for both
the browser URL and the device code, then times out immediately — making it impossible
to authenticate against a deployed instance.

## Symptom

```
✔ Connected to EmDash
ℹ Open your browser to:
  undefined
ℹ Enter code: undefined
◐ Waiting for authorization...
ERROR  Device code expired (timeout). Please try again.
```

## Root Cause

The EmDash server's device authorization endpoint (`/_emdash/api/oauth/device/code`)
wraps its response in a `data` envelope:

```json
{
  "data": {
    "device_code": "TXXuNW-v_KKtdb5A3Jtpo37qPbofZfesirgBMJw_Pz0",
    "user_code": "CEFJ-2NV8",
    "verification_uri": "https://my-site.workers.dev/_emdash/admin/device",
    "expires_in": 900,
    "interval": 5
  }
}
```

The CLI (`dist/cli/index.mjs`) parsed the response and accessed fields directly:

```js
const deviceCode = await codeRes.json();
// deviceCode.verification_uri → undefined (it's at deviceCode.data.verification_uri)
// deviceCode.user_code        → undefined
// deviceCode.device_code      → undefined
```

Because `deviceCode.verification_uri` was `undefined`, the browser was never opened,
no code was displayed, and the polling loop timed out immediately.

## The Fix

Unwrap the `data` envelope before accessing device flow fields, with a fallback for
any future server version that returns a flat response:

```js
const _deviceCodeRaw = await codeRes.json();
const deviceCode = _deviceCodeRaw.data || _deviceCodeRaw;
```

This change is in `dist/cli/index.mjs` at the `loginCommand` handler (around line 1686
in emdash@0.1.0).

## What The Patch Changes

The patch currently affects two files inside the `emdash` package:

| File | Change |
|------|--------|
| `dist/cli/index.mjs` | Unwrap `data` envelope from device authorization response |
| `src/components/InlinePortableTextEditor.tsx` | Portable Text plugin block attr preservation (separate concern, see `emdash-plugin-block-attr-patch.md`) |

## How To Reproduce The Patch

The patch is tracked using pnpm's patched dependency workflow:

- patch file: `patches/emdash@0.1.0.patch`
- package wiring: `package.json` (`pnpm.patchedDependencies`)
- lockfile wiring: `pnpm-lock.yaml`

A normal `pnpm install` reapplies the patch automatically.

To regenerate the patch from scratch (e.g. after upgrading emdash):

```bash
pnpm patch emdash@0.1.0
# edit node_modules/.pnpm_patches/emdash@0.1.0/dist/cli/index.mjs
pnpm patch-commit '/path/shown/above'
```

## Verification

After applying the patch, confirm login works end-to-end:

```bash
npx emdash login --url https://emdash-property-web-builder.etewiah.workers.dev
```

Expected output:

```
✔ Connected to EmDash
ℹ Open your browser to:
  https://emdash-property-web-builder.etewiah.workers.dev/_emdash/admin/device
ℹ Enter code: XXXX-XXXX
◐ Waiting for authorization...
```

Then verify the session:

```bash
npx emdash whoami
```

## Prerequisites

The production Worker must have `EMDASH_AUTH_SECRET` set as an environment variable.
Without it, the server's device flow endpoint cannot issue or verify tokens.

```bash
# Generate a secret
npx emdash auth secret

# Deploy it to Cloudflare
npx wrangler secret put EMDASH_AUTH_SECRET

# Redeploy the Worker
pnpm run deploy
```

## Known Constraints

- This remains a local patch until the response envelope mismatch is resolved upstream.
- If `emdash` is upgraded, check whether the server response format changed — the patch
  may need to be rebased or may become unnecessary.
- The `data || raw` fallback means the fix is non-breaking if the server is later updated
  to return a flat response.

## Related Docs

- [docs/emdash-plugin-block-attr-patch.md](./emdash-plugin-block-attr-patch.md) — the other active patch against `emdash@0.1.0`
- [patches/emdash@0.1.0.patch](../patches/emdash@0.1.0.patch)
