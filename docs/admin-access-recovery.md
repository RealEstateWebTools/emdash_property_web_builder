# Admin Access Recovery

Use this when the EmDash admin is deployed, but passkey login fails and there is no alternate sign-in path available.

This repo includes a scripted recovery flow:

```bash
pnpm reset:admin-access
```

The command is designed for the common production failure mode where:

- the `users` table still has an admin row, but
- the `credentials` table no longer has the matching passkey, and
- EmDash is stuck between "login required" and "setup already complete"

## What the script does

`pnpm reset:admin-access`:

- reads the target D1 database from `wrangler.prod.jsonc`
- uses the local SQLite schema as the source of truth for which auth tables exist
- backs up the remote auth/setup tables into `.tmp/`
- deletes all rows from the auth/setup tables listed below, including all rows in `users`
- resets `emdash:setup_complete` to `false`
- leaves editorial content intact

The script only touches these tables if they exist in the local schema:

- `credentials`
- `auth_tokens`
- `auth_challenges`
- `oauth_accounts`
- `_emdash_api_tokens`
- `_emdash_authorization_codes`
- `_emdash_device_codes`
- `_emdash_oauth_tokens`
- `_emdash_oauth_clients`
- `users`

It also adjusts these options:

- deletes `emdash:setup_state`
- sets `emdash:setup_complete` to `false`

## What it does not do

It does not:

- delete CMS content
- delete blog posts or pages
- rebuild the whole database
- restore old passkeys

It does delete all user accounts in the target D1 database as part of reopening the first-admin setup flow.

## Recovery steps

1. Run:

```bash
pnpm reset:admin-access
```

2. Confirm the prompt.

3. Open the setup flow:

- [https://emdash-property-web-builder.etewiah.workers.dev/_emdash/admin/setup](https://emdash-property-web-builder.etewiah.workers.dev/_emdash/admin/setup)

4. Create the admin again and register a new passkey.

## Useful flags

```bash
pnpm reset:admin-access --dry-run
pnpm reset:admin-access --yes
pnpm reset:admin-access --no-backup
node scripts/reset-admin-access.mjs --site-url https://your-site.example.com
```

Notes:

- `--dry-run` prints the plan without touching remote D1
- `--yes` skips the confirmation prompt
- `--no-backup` skips the remote auth/setup export
- `--site-url` controls the recovery URL printed at the end

## Why this is needed

In passkey mode, EmDash only lets `/_emdash/api/setup/admin` run when there are zero users.

At the same time, the admin setup routes reject if `emdash:setup_complete` is still `true`.

That means a broken deployment can end up in this state:

- login fails because the passkey credential is gone
- setup cannot recreate the admin because setup is still marked complete

Resetting both the auth rows and `emdash:setup_complete` is what reopens the intended first-admin flow.

Because the reset also deletes all rows from `users`, any existing admin or non-admin accounts must be recreated afterward.

## Relationship to `pnpm sync:prod-db`

The content-sync workflow now preserves auth tables by default.

That means:

- use `pnpm sync:prod-db` for content
- use `pnpm reset:admin-access` only when admin recovery is actually needed

## Verification

This workflow is covered by the D1 utility tests in:

- `src/lib/d1-sync-utils.test.ts`

The tests verify that:

- the reset SQL clears the auth/setup tables selected for recovery, including `users`
- content tables are excluded
- `emdash:setup_complete` is reset correctly
