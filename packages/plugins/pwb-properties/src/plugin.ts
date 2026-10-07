import type { SandboxedPlugin } from "emdash/plugin";
import runtime from "./sandbox-entry.js";

// Keep the trusted host and registry build on the same runtime implementation.
const plugin: SandboxedPlugin = runtime;
export default plugin;
