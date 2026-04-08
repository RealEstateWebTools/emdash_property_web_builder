# Resend Email Plugin

A local EmDash plugin that delivers transactional email via the [Resend](https://resend.com) API.

EmDash uses email for magic-link login, user invites, and comment notifications. In development it logs emails to the console. In production a real provider is required — this plugin provides that.

## Why Resend

Resend uses a plain HTTPS API with no native Node.js dependencies, which makes it compatible with Cloudflare Workers where SMTP is unavailable.

---

## Files

| File | Purpose |
|------|---------|
| `src/plugins/resend-email.ts` | Plugin descriptor — declares capabilities, registers with EmDash |
| `src/plugins/resend-email.sandbox.ts` | Runtime logic — `email:deliver` hook, admin settings UI |
| `src/plugins/resend-email.test.ts` | Unit tests |

---

## Setup

### 1. Get a Resend API key

Sign up at resend.com, then go to **API Keys** and create a key with "Sending access".

### 2. Verify your sending domain

In the Resend dashboard go to **Domains**, add your domain, and add the DNS records it shows (SPF, DKIM). Without this, emails will be rejected or land in spam.

### 3. Deploy

The plugin is already registered in `astro.config.mjs`. Deploy as normal:

```bash
pnpm run deploy
```

### 4. Configure in the admin

1. Go to `/_emdash/admin` → **Plugins → Resend Email → Settings**
2. Enter your API key and verified `from` address (e.g. `noreply@yourdomain.com`)
3. Click **Save**

### 5. Activate the provider

1. Go to **Settings → Email**
2. Select `resend-email` as the active provider
3. Enter an address and click **Send test email** to confirm it works

---

## How it works

EmDash routes all outgoing email through a three-stage pipeline:

```
email:beforeSend  →  email:deliver  →  email:afterSend
```

This plugin registers an `email:deliver` exclusive hook. When EmDash needs to send an email (magic link, invite, comment notification), it calls this hook, which:

1. Reads the API key and `from` address from plugin KV storage
2. Calls `POST https://api.resend.com/emails` via `ctx.http.fetch`
3. Throws on a non-ok response so EmDash can surface the error

The API key is stored in plugin KV — not in environment variables — so it can be rotated from the admin without a redeploy.

---

## Security notes

- The API key is never logged or exposed in response bodies
- System emails (magic links, auth tokens) bypass the `email:beforeSend` hooks — no plugin can intercept or rewrite them
- `allowedHosts` in the descriptor restricts outbound fetches to `api.resend.com` only
