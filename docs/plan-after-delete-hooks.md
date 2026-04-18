# Plan: afterDelete Hooks

## What They Are

EmDash 0.4.0 added `afterDelete` lifecycle hooks, fired when content is **permanently deleted**
(not just unpublished or trashed). Plugins can register handlers to clean up derived data,
invalidate caches, or trigger downstream notifications.

## Current Plugin Inventory

| Plugin | Has afterDelete? | Notes |
|--------|-----------------|-------|
| `pwb-theme` | No | Theme settings only; no content dependency |
| `resend-email` | No | Event-driven; no stored state to clean up |
| `site-profile` | No | Site settings only; no content dependency |

None of the current plugins need `afterDelete` today.

## Where It Becomes Valuable

### 1. Enquiry / Lead Attribution Cleanup

The recent milestones (3.2 lead trust pass, 3.3 enquiry attribution baseline) suggest enquiry
data is being tracked. If EmDash content entries (properties, posts) are linked to enquiry records
in the PWB backend, deleting a content entry should trigger cleanup:

- Mark enquiries linked to a deleted property as `property_deleted`
- Remove attribution references that would cause broken lookups in lead reports

This requires a plugin with `network:fetch` capability to call the PWB API on delete.

### 2. Search Index Invalidation

If a search index (Algolia, Cloudflare Vectorize, or similar) is added later, `afterDelete`
is the correct hook to remove stale entries.

### 3. Media Orphan Prevention

If future plugins track media usage (e.g., a backlink tracker — see `docs/plugin-ideas/pwb-backlink-tracker.md`),
`afterDelete` can mark images as unreferenced so a cleanup job can remove them.

## Implementation Pattern

In a sandbox plugin file (e.g., `src/plugins/pwb-theme.sandbox.ts`), hooks are registered via
the plugin API. The pattern for `afterDelete`:

```typescript
plugin.on('afterDelete', async ({ collection, entry, context }) => {
  if (collection !== 'posts') return
  // perform cleanup
  await context.fetch('https://api.example.com/cleanup', {
    method: 'POST',
    body: JSON.stringify({ slug: entry.slug }),
  })
})
```

The `context.fetch` call requires the plugin to declare `capabilities: ['network:fetch']` and
list the allowed host in `allowedHosts`.

## Recommended First Step

Don't add `afterDelete` hooks speculatively. The right trigger is:

1. A content collection in EmDash has a derived artifact elsewhere (search index, PWB record,
   cache entry, media reference)
2. Leaving that artifact stale causes a visible bug or data integrity issue

When the enquiry attribution work matures to the point where EmDash content IDs are stored in
the PWB enquiry records, add an `afterDelete` hook to the `site-profile` plugin (or a dedicated
`pwb-content-lifecycle` plugin) to notify the PWB backend.

## Related Files

- `src/plugins/site-profile.sandbox.ts` — most likely home for a content lifecycle hook
- `src/plugins/resend-email.sandbox.ts` — reference for `network:fetch` pattern
- `docs/plugin-ideas/pwb-enquiry.md` — enquiry plugin ideas (if exists)
