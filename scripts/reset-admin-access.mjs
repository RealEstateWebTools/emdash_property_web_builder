#!/usr/bin/env node

import { access, mkdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import {
	getAdminAccessResetPlanFromSqliteDatabase,
	getD1DatabaseNameFromConfigFile,
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
			cwd: options.cwd ?? projectRoot,
			stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
			shell: false,
		});

		let stdout = "";
		let stderr = "";

		if (child.stdout) {
			child.stdout.on("data", (chunk) => {
				stdout += chunk.toString();
				if (options.stdio === "inherit") process.stdout.write(chunk);
			});
		}

		if (child.stderr) {
			child.stderr.on("data", (chunk) => {
				stderr += chunk.toString();
				if (options.stdio === "inherit") process.stderr.write(chunk);
			});
		}

		child.on("error", rejectPromise);
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
	const answer = await rl.question("Continue? Type 'yes' to reset admin access: ");
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
	const shouldBackup = !hasFlag(args, "--no-backup");
	const configPath = resolve(projectRoot, getArgValue(args, "--config", "wrangler.prod.jsonc"));
	const localDbPath = resolve(projectRoot, getArgValue(args, "--local-db", "data.db"));
	const explicitDbName = getArgValue(args, "--db");
	const siteUrl = getArgValue(args, "--site-url", "");

	try {
		await ensureReadable(configPath, "Wrangler config");
		await ensureReadable(localDbPath, "Local SQLite database");

		const dbName = explicitDbName ?? (await getD1DatabaseNameFromConfigFile(configPath));
		const tempDir = resolve(projectRoot, ".tmp");
		await mkdir(tempDir, { recursive: true });
		const timestamp = Date.now();
		const backupPath = resolve(tempDir, `d1-admin-access-backup-${timestamp}.sql`);
		const resetPath = resolve(tempDir, `d1-admin-access-reset-${timestamp}.sql`);
		const resetPlan = getAdminAccessResetPlanFromSqliteDatabase(localDbPath);
		await writeFile(resetPath, resetPlan.sql, "utf8");

		const summary = [
			"",
			"Remote EmDash admin access reset prepared.",
			`Wrangler config: ${configPath}`,
			`Remote D1 database: ${dbName}`,
			`Local schema source: ${localDbPath}`,
			`Reset SQL file: ${resetPath}`,
			shouldBackup ? `Remote backup file: ${backupPath}` : "Remote backup: skipped",
			`Auth tables to clear: ${resetPlan.tables.join(", ") || "none found"}`,
			"Options to clear: emdash:setup_state",
			"Option to reset: emdash:setup_complete => false",
			"",
			"This deletes all rows from the listed auth/setup tables, including all users. Site content is preserved.",
			"After the reset, open /_emdash/admin/setup and create a new admin passkey.",
			"",
		].join("\n");

		if (dryRun) {
			console.log(summary);
			console.log("Dry run only. No remote changes executed.");
			return;
		}

		await confirmOrExit(summary, yes);

		if (shouldBackup) {
			const backupTables = [...resetPlan.tables, "options"];
			const tableArgs = backupTables.flatMap((table) => ["--table", table]);
			await runCommand(
				"npx",
				["wrangler", "d1", "export", dbName, "--remote", "--output", backupPath, "--config", configPath, ...tableArgs],
				{ stdio: "inherit" },
			);
		}

		await runCommand(
			"npx",
			["wrangler", "d1", "execute", dbName, "--file", resetPath, "--remote", "--config", configPath, "--yes"],
			{ stdio: "inherit" },
		);

		console.log("");
		console.log("Remote admin access reset completed successfully.");
		console.log(`Reset SQL kept at: ${resetPath}`);
		if (shouldBackup) {
			console.log(`Remote auth/setup backup kept at: ${backupPath}`);
		}
		if (siteUrl) {
			console.log(`Next step: ${siteUrl.replace(/\/$/, "")}/_emdash/admin/setup`);
		} else {
			console.log("Next step: open /_emdash/admin/setup on the target site and register a new admin passkey.");
		}
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}

main();
