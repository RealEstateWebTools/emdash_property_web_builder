#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import { exportSqliteForD1 } from "./export-sqlite-for-d1.mjs";
import { applyRemoteWrites, buildResetAndImportSql } from "./lib/d1-remote-writes.mjs";
import {
	getAdditiveSchemaSyncPlan,
	getBackupTableNamesFromSqliteDatabase,
	getD1DatabaseNameFromConfigFile,
	getResetPlanFromSqliteDatabase,
	isDuplicateConstraintError,
} from "./lib/d1-sync-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

function hasFlag(args, flag) {
	return args.includes(flag);
}

function getArgValue(args, flag, fallback = undefined) {
	const index = args.indexOf(flag);
	if (index === -1) return fallback;
	return args[index + 1] ?? fallback;
}

async function ensureReadable(filePath, description) {
	try {
		await access(filePath, constants.R_OK);
	} catch {
		throw new Error(`${description} not found or not readable: ${filePath}`);
	}
}

function runCommand(command, args, options = {}) {
	return new Promise((resolvePromise, rejectPromise) => {
		const child = spawn(command, args, {
			cwd: options.cwd,
			stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
			shell: false,
		});

		let stdout = "";
		let stderr = "";

		if (child.stdout) {
			child.stdout.on("data", (chunk) => {
				stdout += chunk.toString();
				if (options.stdio === "inherit") {
					process.stdout.write(chunk);
				}
			});
		}

		if (child.stderr) {
			child.stderr.on("data", (chunk) => {
				stderr += chunk.toString();
				if (options.stdio === "inherit") {
					process.stderr.write(chunk);
				}
			});
		}

		child.on("error", (error) => {
			rejectPromise(error);
		});

		child.on("close", (code) => {
			if (code !== 0) {
				const error = new Error(stderr.trim() || stdout.trim() || `${command} exited with code ${code}`);
				error.code = code;
				error.stdout = stdout;
				error.stderr = stderr;
				rejectPromise(error);
				return;
			}
			resolvePromise({ stdout, stderr });
		});
	});
}

async function confirmOrExit(summary, skipPrompt) {
	if (skipPrompt) return;

	console.log(summary);
	const rl = readline.createInterface({ input, output });
	const answer = await rl.question("Continue? Type 'yes' to proceed: ");
	rl.close();

	if (answer.trim().toLowerCase() !== "yes") {
		console.log("Cancelled.");
		process.exit(0);
	}
}

async function main() {
	const args = process.argv.slice(2);
	const dryRun = hasFlag(args, "--dry-run");
	const yes = hasFlag(args, "--yes");
	const shouldBackup = hasFlag(args, "--backup");
	const forceReset = hasFlag(args, "--force-reset");
	const configPath = resolve(projectRoot, getArgValue(args, "--config", "wrangler.prod.jsonc"));
	const localDbPath = resolve(projectRoot, getArgValue(args, "--local-db", "data.db"));
	const explicitDbName = getArgValue(args, "--db");

	// A reset deletes remote data. D1 doesn't document whether a failed import
	// rolls back, so a reset always comes with a backup (and a Time Travel
	// bookmark, see scripts/lib/d1-remote-writes.mjs).
	if (forceReset && !shouldBackup && !dryRun) {
		console.error("--force-reset clears remote data and requires --backup:");
		console.error("  pnpm run sync:prod-db --backup --force-reset");
		process.exit(1);
	}

	try {
		await ensureReadable(configPath, "Wrangler config");
		await ensureReadable(localDbPath, "Local SQLite database");

		const dbName = explicitDbName ?? (await getD1DatabaseNameFromConfigFile(configPath));
		const tempDir = resolve(projectRoot, ".tmp");
		await mkdir(tempDir, { recursive: true });
		const outputPath = resolve(tempDir, `d1-import-${Date.now()}.sql`);
		const backupPath = resolve(tempDir, `d1-backup-${Date.now()}.sql`);
		const resetAndImportPath = resolve(tempDir, `d1-reset-and-import-${Date.now()}.sql`);
		const schemaSyncPath = resolve(tempDir, `d1-schema-sync-${Date.now()}.sql`);
		const exportMode = forceReset ? "data-only" : "full";
		const backupTables = shouldBackup ? getBackupTableNamesFromSqliteDatabase(localDbPath) : [];

		const result = await exportSqliteForD1({
			sourcePath: localDbPath,
			outputPath,
			mode: exportMode,
		});

		let resetPlan = null;
		if (forceReset) {
			// One file, one import: D1 blocks the database during an import, so
			// visitors never see the emptied tables between reset and import.
			resetPlan = getResetPlanFromSqliteDatabase(localDbPath);
			const importSql = await readFile(outputPath, "utf8");
			await writeFile(resetAndImportPath, buildResetAndImportSql(resetPlan.sql, importSql), "utf8");
		}

		let schemaSyncPlan = { statements: [], sql: "" };

		const summary = [
			"",
			"Local SQLite database export prepared for remote D1 import.",
			`Local DB: ${localDbPath}`,
			`Wrangler config: ${configPath}`,
			`Remote D1 database: ${dbName}`,
			`Sanitized SQL file: ${outputPath}`,
			`Export mode: ${exportMode}`,
			`Removed SQLite-only lines: ${result.removedLineCount}`,
			shouldBackup
				? `Remote backup file: ${backupPath} (${backupTables.length} tables, excluding FTS virtual tables)`
				: "Remote backup: skipped",
			shouldBackup ? `Schema sync file: ${schemaSyncPath}` : "Schema sync: unavailable without backup",
			forceReset
				? `Remote reset + import file: ${resetAndImportPath} (${resetPlan.tables.length} tables reset, one import)`
				: "Remote reset: skipped",
			"Recovery: a Time Travel bookmark is recorded before any write; on failure the restore command is printed.",
			"",
			"This imports sanitized SQL into the remote D1 database.",
			forceReset
				? "Remote data will be cleared before import. Auth, enquiries, plugin data, comments, logs and environment settings (plugin settings, email provider, site URL) are kept."
				: "If the remote database already contains conflicting rows, the import may fail.",
			"",
		].join("\n");

		if (dryRun) {
			console.log(summary);
			console.log("Dry run only. No remote import executed.");
			return;
		}

		await confirmOrExit(summary, yes);

		if (shouldBackup) {
			const tableArgs = backupTables.flatMap((table) => ["--table", table]);
			await runCommand(
				"npx",
				["wrangler", "d1", "export", dbName, "--remote", "--output", backupPath, "--config", configPath, ...tableArgs],
				{ cwd: projectRoot, stdio: "inherit" },
			);

			const remoteBackupSql = await readFile(backupPath, "utf8");
			schemaSyncPlan = getAdditiveSchemaSyncPlan(localDbPath, remoteBackupSql);
			await writeFile(schemaSyncPath, schemaSyncPlan.sql, "utf8");
		}

		await applyRemoteWrites(
			{
				dbName,
				configPath,
				cwd: projectRoot,
				backupPath: shouldBackup ? backupPath : undefined,
				steps: [
					...(schemaSyncPlan.statements.length > 0 ? [{ label: "schema sync", path: schemaSyncPath }] : []),
					forceReset
						? { label: "reset and import", path: resetAndImportPath }
						: { label: "import", path: outputPath },
				],
			},
			{ run: runCommand },
		);

		console.log("");
		console.log("Remote D1 import completed successfully.");
		console.log(`Sanitized SQL kept at: ${outputPath}`);
		if (shouldBackup) {
			console.log(`Remote backup kept at: ${backupPath}`);
		}
	} catch (error) {
		if (!forceReset && isDuplicateConstraintError(error)) {
			console.error("");
			console.error("Remote import failed because the remote D1 database already contains conflicting rows.");
			console.error("Recommended retry:");
			console.error("  pnpm run sync:prod-db --backup --force-reset");
			console.error("");
			console.error("That will back up the current remote DB, clear remote table data, and then import local data.");
			process.exit(1);
		}

		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}

main();
