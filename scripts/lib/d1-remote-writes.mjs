/**
 * The remote-write half of `pnpm run sync:prod-db`, separated so its order of
 * operations can be tested with a fake command runner.
 *
 * What Cloudflare documents, and how this relies on it:
 * - A D1 import "blocks the D1 for [its] duration" (API reference, import
 *   endpoint). The reset and the data therefore go in ONE file, so visitors
 *   never see the emptied tables between the two.
 * - Whether a failed import rolls back is NOT documented. So before writing,
 *   the current Time Travel bookmark is recorded, and on failure the exact
 *   `wrangler d1 time-travel restore` command is printed. Restoring is left to
 *   the operator: it overwrites the live database.
 *   https://developers.cloudflare.com/d1/reference/time-travel/
 */
import { readFile } from "node:fs/promises";
import { chunkSqlStatements, splitSqlStatements } from "./d1-sync-utils.mjs";

/** The SQL for a --force-reset sync: deletes first, then the local rows, in one file. */
export function buildResetAndImportSql(resetSql, importSql) {
	return [
		"-- Reset: remove remote rows that the import replaces (preserved data is kept).",
		resetSql.trim(),
		"-- Import: local data.",
		importSql.trim(),
		"",
	].join("\n");
}

/** `wrangler d1 time-travel info --json` output → bookmark, or null. */
export function parseTimeTravelBookmark(stdout) {
	const start = stdout.indexOf("{");
	const end = stdout.lastIndexOf("}");
	if (start === -1 || end < start) return null;
	try {
		const bookmark = JSON.parse(stdout.slice(start, end + 1))?.bookmark;
		return typeof bookmark === "string" && bookmark ? bookmark : null;
	} catch {
		return null;
	}
}

/** The command that puts the database back to before the sync. */
export function restoreCommand(dbName, bookmark, configPath) {
	return `npx wrangler d1 time-travel restore ${dbName} --bookmark=${bookmark} --config ${configPath}`;
}

function isImportAuthError(error) {
	const message = error instanceof Error ? `${error.message}\n${error.stderr ?? ""}\n${error.stdout ?? ""}` : String(error);
	return message.includes("/import") && message.includes("Authentication error");
}

async function executeSqlFile(run, { dbName, configPath, cwd, log }, step) {
	try {
		await run("npx", ["wrangler", "d1", "execute", dbName, "--file", step.path, "--remote", "--config", configPath, "--yes"], {
			cwd,
			stdio: "inherit",
		});
	} catch (error) {
		if (!isImportAuthError(error)) throw error;
		// Tokens without import permission: run the statements in batches. This
		// path does NOT block the database between batches.
		const batches = chunkSqlStatements(splitSqlStatements(await readFile(step.path, "utf8")));
		log(`Falling back to batched remote execution for ${step.label}: ${batches.length} batches (not a single import).`);
		for (let index = 0; index < batches.length; index += 1) {
			log(`Executing batch ${index + 1}/${batches.length}...`);
			await run("npx", ["wrangler", "d1", "execute", dbName, "--command", batches[index], "--remote", "--config", configPath, "--yes"], {
				cwd,
				stdio: "inherit",
			});
		}
	}
}

/**
 * Record a Time Travel bookmark, then run each SQL file step against the
 * remote database. On failure, prints how to restore and rethrows.
 *
 * @param {{ dbName: string, configPath: string, cwd: string, steps: Array<{ label: string, path: string }>, backupPath?: string }} plan
 * @param {{ run: Function, log?: Function, error?: Function }} deps run(command, args, options) → Promise<{ stdout }>
 * @returns {Promise<{ bookmark: string | null }>}
 */
export async function applyRemoteWrites(plan, { run, log = console.log, error: logError = console.error }) {
	const context = { dbName: plan.dbName, configPath: plan.configPath, cwd: plan.cwd, log };

	let bookmark = null;
	try {
		const { stdout } = await run("npx", ["wrangler", "d1", "time-travel", "info", plan.dbName, "--json", "--config", plan.configPath], {
			cwd: plan.cwd,
		});
		bookmark = parseTimeTravelBookmark(stdout);
	} catch {
		// Reported below; the SQL backup (if any) is the fallback.
	}
	if (bookmark) log(`Time Travel bookmark before writing: ${bookmark}`);
	else logError("Warning: could not read a Time Travel bookmark; recovery would rely on the SQL backup.");

	for (const step of plan.steps) {
		try {
			await executeSqlFile(run, context, step);
		} catch (err) {
			logError("");
			logError(`Remote ${step.label} failed. The remote database may be partly changed.`);
			if (bookmark) {
				logError("To put it back exactly as it was before this sync, run:");
				logError(`  ${restoreCommand(plan.dbName, bookmark, plan.configPath)}`);
			}
			if (plan.backupPath) logError(`SQL backup of the remote tables: ${plan.backupPath}`);
			throw err;
		}
	}
	return { bookmark };
}
