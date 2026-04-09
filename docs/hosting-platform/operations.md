# Organizational & Operational Scale Plan

Building a hosting platform involves significant operational considerations beyond the initial code.

## 1. Managed Service Tiers

| Tier | Resources | Features |
| :--- | :--- | :--- |
| **Free** | 5GB BW, 1GB D1 | Subdomain only, Community support |
| **Starter** | 50GB BW, 10GB D1 | 1 Custom Domain, Email support |
| **Growth** | 250GB BW, 50GB D1 | 5 Custom Domains, Slack support |

## 2. Monetization & Metering

To scale profitably, you must meter usage objectively.
* **Compute**: Track total Worker requests/CPU time.
* **Storage**: Periodically query D1 `db_size` and R2 `usage` via API.
* **Billing System**: Integrate with **Polar.sh** or **Stripe** to handle subscriptions and overages.

## 3. Dealing with Infrastructure Limits

Cloudflare has hard and soft limits that must be managed:

* **Database Count**: Default limits on D1 instances per account (often 100-1000). For larger scales, you require an Enterprise agreement or a sharding strategy across multiple Cloudflare accounts.
* **KV Consistency**: Worker KV is eventually consistent. Routing updates may take a few seconds to propagate globally.
* **R2 Operations**: Minimize expensive class A operations (writes) by caching rendered pages.

## 4. Operational Maintenance

### Backup & Recovery
While D1 provides snapshots, you should implement an independent "Maintenance Worker" that exports tenant data to a centralized backup bucket periodically to protect against catastrophic account failure.

### Centralized Logging
Use **Workers Analytics Engine** or a centralized log drain (like Axiom or BetterStack) to monitor the health of thousands of independent site Workers from a single dashboard.

### Abuse & Security
Implement automated scanning for malicious scripts or phishing content. Use **Cloudflare WAF** rules globally on the dispatcher to protect all tenants from common CVEs and Bot traffic.
