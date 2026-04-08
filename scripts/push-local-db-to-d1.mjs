#!/usr/bin/env node

import { access, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import os from "node:os";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import { exportSqliteForD1 } from "./export-sqlite-for-d1.mjs";
import { getD1DatabaseNameFromConfigFile, getResetPlanFromSqliteDatabase } from "./lib/d1-sync-utils.mjs";

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
			stdio: options.stdio ?? "inherit",
			shell: false,
		});

		child.on("error", (error) => {
			rejectPromise(error);
		});

		child.on("close", (code) => {
			if (code !== 0) {
				rejectPromise(new Error(`${command} exited with code ${code}`));
				return;
			}
			resolvePromise();
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

	try {
		await ensureReadable(configPath, "Wrangler config");
		await ensureReadable(localDbPath, "Local SQLite database");

		const dbName = explicitDbName ?? (await getD1DatabaseNameFromConfigFile(configPath));
		const tempDir = resolve(projectRoot, ".tmp");
		await mkdir(tempDir, { recursive: true });
		const outputPath = resolve(tempDir, `d1-import-${Date.now()}.sql`);
		const backupPath = resolve(tempDir, `d1-backup-${Date.now()}.sql`);
		const resetPath = resolve(tempDir, `d1-reset-${Date.now()}.sql`);
		const exportMode = forceReset ? "data-only" : "full";

		const result = await exportSqliteForD1({
			sourcePath: localDbPath,
			outputPath,
			mode: exportMode,
		});

		let resetPlan = null;
		if (forceReset) {
			resetPlan = getResetPlanFromSqliteDatabase(localDbPath);
			await mkdir(tempDir, { recursive: true });
			const { writeFile } = await import("node:fs/promises");
			await writeFile(resetPath, resetPlan.sql, "utf8");
		}

		const summary = [
			"",
			"Local SQLite database export prepared for remote D1 import.",
			`Local DB: ${localDbPath}`,
			`Wrangler config: ${configPath}`,
			`Remote D1 database: ${dbName}`,
			`Sanitized SQL file: ${outputPath}`,
			`Export mode: ${exportMode}`,
			`Removed SQLite-only lines: ${result.removedLineCount}`,
			shouldBackup ? `Remote backup file: ${backupPath}` : "Remote backup: skipped",
			forceReset
				? `Remote reset file: ${resetPath} (${resetPlan.tables.length} tables)`
				: "Remote reset: skipped",
			"",
			"This imports sanitized SQL into the remote D1 database.",
			forceReset
				? "Remote data will be cleared before import."
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
			await runCommand(
				"npx",
				["wrangler", "d1", "export", dbName, "--remote", "--output", backupPath, "--config", configPath],
				{ cwd: projectRoot, stdio: "inherit" },
			);
		}

		if (forceReset) {
			await runCommand(
				"npx",
				["wrangler", "d1", "execute", dbName, "--file", resetPath, "--remote", "--config", configPath, "--yes"],
				{ cwd: projectRoot, stdio: "inherit" },
			);
		}

		await runCommand(
			"npx",
			["wrangler", "d1", "execute", dbName, "--file", outputPath, "--remote", "--config", configPath, "--yes"],
			{ cwd: projectRoot, stdio: "inherit" },
		);

		console.log("");
		console.log("Remote D1 import completed successfully.");
		console.log(`Sanitized SQL kept at: ${outputPath}`);
		if (shouldBackup) {
			console.log(`Remote backup kept at: ${backupPath}`);
		}
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}

main();
