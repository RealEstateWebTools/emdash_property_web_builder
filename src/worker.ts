// EmDash's Worker entry wraps Astro's handler with a scheduled() handler that
// drives scheduled publishing and plugin cron (emdash >= 0.19). Replaces the
// removed request-driven PiggybackScheduler. Requires a Cron Trigger in wrangler.
export { default, PluginBridge } from "@emdash-cms/cloudflare/worker";
