# Infrastructure & Architectural Plan: Managed EmDash Hosting

This document outlines the technical architecture and infrastructure required to build a managed hosting platform for EmDash, similar to DashHost.

## 1. High-Level Architecture

A managed EmDash platform leverages the **Cloudflare Developer Platform** as its core infrastructure. It uses a "multi-tenant" architecture where each site is run as an isolated instance within a shared platform environment.

### Core Components
| Component | Role | Technology |
| :--- | :--- | :--- |
| **Control Plane** | Management UI, user auth, billing, and provisioning API. | Astro + Better-Auth + Polar |
| **Provisioning Engine** | Automates the creation of resources for new sites via API. | Cloudflare API + Workers |
| **Routing Layer** | Global dispatcher that routes traffic to specific user scripts. | **Workers for Platforms** |
| **Site Instance** | The actual EmDash site logic (the "tenant" code). | Cloudflare Worker (Customer Script) |
| **Global Database** | Metadata about users, sites, and routing. | Cloudflare D1 (Central) |
| **Tenant Database** | Site content, schema, and revisions per site. | **Cloudflare D1 (Per-site)** |
| **Storage** | Media and file uploads per site. | **Cloudflare R2 (Per-site)** |
| **Configuration** | High-speed routing metadata. | **Cloudflare KV** |

---

## 2. Infrastructure Detail: Workers for Platforms

The most critical component is **Workers for Platforms**. This specialized Cloudflare feature allows you to run your customers' code (or your standardized template code) on your own specialized infrastructure.

### The Dispatcher (The "Router")
The "Entrypoint" Worker handles all incoming traffic.
1. It inspects the `Host` header (e.g., `user-site.yourplatform.com`).
2. It looks up the `site_id` and corresponding `script_id` in **Cloudflare KV**.
3. It uses `env.DISPATCH_NAMESPACE.get(script_id).fetch(request)` to execution the site-specific logic without leaving the edge.

### Deployment Namespaces
You manage a "Namespace" where each tenant's code lives. When a user "deploys" or selects a template, you upload the pre-built Astro project (bundled for Workers) to this namespace using the Cloudflare API.

---

## 3. Data Isolation Strategy

To ensure security and scalability, data must be isolated per tenant.

### Individual D1 Databases
Each site gets its own D1 database instance.
* **Benefits**: Complete data isolation, individual point-in-time recovery, and simplified migrations for specific customers.
* **Management**: Requires a robust provisioning layer that uses the Cloudflare API to create `D1_RESOURCE` records and apply initial schema migrations (`npx emdash types` and seed equivalent).

### Dynamic Binding
Site Workers use **Service Bindings** or environment variables to connect to their specific D1/R2 resources. In a "Workers for Platforms" context, these connections are often passed dynamically or mapped via configuration at dispatch time.

---

## 4. Provisioning Flow (The "Create" Action)

When a user clicks "Create Site" in the dashboard:
1. **DB Creation**: Call Cloudflare API to create a new `D1` instance and wait for propagation.
2. **Bucket Creation**: Create a new `R2` bucket for the site's media.
3. **Worker Upload**: Upload the selected template bundle (e.g., "blog" template) to the **Dispatch Namespace**.
4. **Binding & Config**: Update the site metadata in the Central DB and sync the routing record to **Cloudflare KV**.
5. **DNS/SSL**: Add the subdomain to your Cloudflare zone. If using custom domains, trigger the SSL flow via **Cloudflare for SaaS**.

---

## 5. Custom Domains (Cloudflare for SaaS)

To allow users to use their own domains (e.g., `www.luxuryestates.com`):
1. You utilize the **Cloudflare for SaaS** (Custom Hostnames) feature.
2. The user points a CNAME to your platform's base URL.
3. Your API adds a "Custom Hostname" entry to your zone.
4. Cloudflare manages the TLS certificate lifecycle (issuance and renewal) automatically.
