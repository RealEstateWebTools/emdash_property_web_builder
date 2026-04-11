# Agent Skills

Skills live in `.agents/skills/<name>/SKILL.md`. Load a skill before starting work that falls within its domain — it provides patterns, gotchas, and reference material that prevents common mistakes.

## Available Skills

| Skill | When to load |
|-------|-------------|
| **building-emdash-site** | Creating pages, defining collections, writing seed files, querying content, rendering Portable Text, menus, taxonomies, widgets, deployment config. Start here for most site work. |
| **creating-plugins** | Building EmDash plugins — hooks, storage, settings, admin UI, API routes, custom Portable Text block types. |
| **emdash-cli** | Managing content, schema, media, or types from the command line. Seeding, exporting, type generation, scripted CMS operations. |
| **pwb-mcp-content** | Reading or writing remote CMS content via the deployed EmDash MCP server. Covers auth, content ownership, and payload format. |
| **agent-browser** | Browser automation — verifying visual changes, filling forms, capturing screenshots. Uses the `agent-browser` CLI. |
| **adversarial-reviewer** | Hostile code review. Load when you want bugs found, not reassurance. |

## Notes

- Skills are not auto-loaded. Explicitly load the relevant skill at the start of a task.
- Multiple skills can be loaded for the same task (e.g. `building-emdash-site` + `agent-browser` when building and visually verifying a new page).
- Reference files in `.agents/skills/<name>/references/` contain deeper detail on specific topics within a skill.
