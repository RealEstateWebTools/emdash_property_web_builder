#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { keepInsertStatementsOnly, sanitizeSqliteDump } from "./lib/d1-sync-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

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
			stdio: ["ignore", "pipe", "pipe"],
			shell: false,
		});

		let stdout = "";
		let stderr = "";

		child.stdout.on("data", (chunk) => {
			stdout += chunk.toString();
		});

		child.stderr.on("data", (chunk) => {
			stderr += chunk.toString();
		});

		child.on("error", (error) => {
			rejectPromise(error);
		});

		child.on("close", (code) => {
			if (code !== 0) {
				rejectPromise(new Error(stderr.trim() || `${command} exited with code ${code}`));
				return;
			}
			resolvePromise({ stdout, stderr });
		});
	});
}

export async function exportSqliteForD1({ sourcePath, outputPath, mode = "full" }) {
	await ensureReadable(sourcePath, "SQLite database");
	await mkdir(dirname(outputPath), { recursive: true });

	const { stdout } = await runCommand("sqlite3", [sourcePath, ".dump"], { cwd: projectRoot });
	const { sql: sanitizedSql, removedLineCount } = sanitizeSqliteDump(stdout);
	const sql = mode === "data-only" ? keepInsertStatementsOnly(sanitizedSql) : sanitizedSql;

	await writeFile(outputPath, sql, "utf8");

	return {
		outputPath,
		mode,
		removedLineCount,
		statementCount: sql.split(";\n").filter((statement) => statement.trim()).length,
	};
}

async function main() {
	const args = process.argv.slice(2);
	const sourcePath = resolve(projectRoot, getArgValue(args, "--db", "data.db"));
	const outputPath = resolve(projectRoot, getArgValue(args, "--out", ".tmp/d1-import.sql"));
	const mode = getArgValue(args, "--mode", "full");

	try {
		const result = await exportSqliteForD1({ sourcePath, outputPath, mode });
		console.log(`Exported D1-safe SQL to ${result.outputPath}`);
		console.log(`Export mode: ${result.mode}`);
		console.log(`Removed ${result.removedLineCount} SQLite-specific lines`);
		console.log(`Approximate statement count: ${result.statementCount}`);
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
	main();
}
