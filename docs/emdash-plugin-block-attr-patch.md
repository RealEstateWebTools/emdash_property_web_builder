# EmDash Plugin Block Attr Patch

This repository carries a local patch against `emdash@0.1.0` so Portable Text plugin
blocks can persist arbitrary attributes through the editor roundtrip.

This is not an optional implementation detail. The patch is required for rich
`propertyEmbed` blocks to retain fields like:

- `slug`
- `variant`
- `ctaLabel`

Without the patch, EmDash collapses custom plugin blocks to a narrower stored shape and
those additional fields are lost during edit/save cycles.

## Why This Patch Exists

The original local behavior in EmDash's editor only safely persisted:

```json
{
  "_type": "propertyEmbed",
  "_key": "abc123",
  "id": "beautiful-villa-marbella"
}
```

That forced the first `propertyEmbed` implementation in this repo to overload `id` with
the property slug and avoid exposing richer embed settings.

The product requirement is broader. We need to support blocks like:

```json
{
  "_type": "propertyEmbed",
  "_key": "abc123",
  "slug": "beautiful-villa-marbella",
  "variant": "compact",
  "ctaLabel": "View Property"
}
```

That requires the editor to preserve arbitrary plugin-block attrs rather than only a
minimal `id`.

## What The Patch Changes

The patch updates the EmDash editor implementation so:

1. Portable Text plugin blocks are converted into ProseMirror attrs without discarding
   custom keys.
2. ProseMirror `pluginBlock` nodes are converted back into Portable Text blocks with the
   original attrs restored.
3. `_type` and `_key` are reconstructed correctly.
4. Custom attrs like `slug`, `variant`, `ctaLabel`, booleans, and other primitive fields
   survive editor roundtrips.

The patch currently affects:

- `src/components/InlinePortableTextEditor.tsx`
- `src/components/plugin-block-attrs.ts`

Those paths are inside the patched `emdash` package, not this repo's own `src/`.

## Reproducible Patch Workflow

This repository does **not** rely on hand-edited `node_modules` as the source of truth.

The patch is tracked using pnpm's patched dependency workflow:

- patch file: [patches/emdash@0.1.0.patch](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/patches/emdash@0.1.0.patch)
- package wiring: [package.json](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/package.json)
- lockfile wiring: [pnpm-lock.yaml](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/pnpm-lock.yaml)

`package.json` contains:

```json
{
  "pnpm": {
    "patchedDependencies": {
      "emdash@0.1.0": "patches/emdash@0.1.0.patch"
    }
  }
}
```

That means a normal `pnpm install` will reapply the patch automatically.

## How The Patch Was Created

The patch was generated with pnpm's native patch commands:

```bash
pnpm patch emdash@0.1.0 --edit-dir /tmp/emdash-patch
pnpm patch-commit /tmp/emdash-patch --patches-dir patches
```

This approach is preferable to force-adding files from `node_modules` because:

- the patch is tracked in a single reviewable file
- installs are reproducible
- upgrading `emdash` later has a clear rebase point
- CI and other developers can apply the same fix automatically

## How To Update The Patch Later

If you need to change the EmDash editor behavior again:

1. Run `pnpm patch emdash@0.1.0 --edit-dir /tmp/emdash-patch`
2. Update the extracted package files in `/tmp/emdash-patch`
3. Run tests in this repository before committing
4. Run `pnpm patch-commit /tmp/emdash-patch --patches-dir patches`
5. Review changes in:
   - [patches/emdash@0.1.0.patch](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/patches/emdash@0.1.0.patch)
   - [package.json](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/package.json)
   - [pnpm-lock.yaml](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/pnpm-lock.yaml)

## Verification

The minimum verification for this patch is:

```bash
pnpm exec vitest run src/lib/pwb-property-embed-roundtrip.test.ts
```

That test suite covers:

- helper roundtrip behavior for arbitrary plugin-block attrs
- fallback key generation
- plugin block registration for `slug`, `variant`, and `ctaLabel`
- repository wiring for the `pnpm` patched dependency

For manual verification:

1. run `npx emdash dev`
2. open the admin editor
3. insert a `Property` block
4. set `slug`, `variant`, and `ctaLabel`
5. save and reload the entry
6. confirm all three fields survive the editor roundtrip

## Known Constraints

- This remains a local repository patch until the change is upstreamed into EmDash.
- If `emdash` is upgraded, the patch may need to be regenerated or rebased.
- The public renderer still supports legacy `id`-based blocks for backward compatibility,
  but new embeds should use `slug`.

## Related Docs

- [docs/pwb-properties-content-embedding.md](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/docs/pwb-properties-content-embedding.md)
- [patches/emdash@0.1.0.patch](/Users/etewiah/dev/sites-older/property_web_builder/emdash_property_web_builder/patches/emdash@0.1.0.patch)
