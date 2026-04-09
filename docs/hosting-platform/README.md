# Hosting Platform Architecture

This directory contains the documentation for building and scaling a managed hosting platform for EmDash, based on the patterns used by [DashHost](https://dashhost.io).

## Contents

1.  **[Infrastructure & Architecture](infrastructure.md)**: Details the core Cloudflare stack (Workers for Platforms, D1, R2, etc.) and provisioning flows.
2.  **[Request Flow & Visual Architecture](request-flow.md)**: A visualization of how traffic flows through the platform dispatcher to tenant sites.
3.  **[Operations & Scale Plan](operations.md)**: Guidelines for monetization, metering, team structure, and handling platform scale limits.

## Core Technology Stack

*   **Routing**: Cloudflare Workers for Platforms (Dynamic Dispatching)
*   **Database**: Per-tenant Cloudflare D1 (SQLite at the edge)
*   **Storage**: Per-tenant Cloudflare R2 (S3-compatible)
*   **Config**: Cloudflare KV (Host-to-Script mapping)
*   **Frontend**: Astro (The EmDash framework)
*   **Billing**: Polar / Stripe
