import { readFile } from "node:fs/promises";
import Database from "better-sqlite3";

const SQLITE_DUMP_LINE_PATTERNS = [
	/^PRAGMA foreign_keys=OFF;$/,
	/^PRAGMA writable_schema=ON;$/,
	/^PRAGMA writable_schema=OFF;$/,
	/^BEGIN TRANSACTION;$/,
	/^COMMIT;$/,
	/^ROLLBACK;$/,
	/^VACUUM;$/,
];

export function sanitizeSqliteDump(sql) {
	const lines = sql.split(/\r?\n/);
	const kept = [];
	let skipWritableSchemaBlock = false;
	let removedLineCount = 0;

	for (const line of lines) {
		if (/^PRAGMA writable_schema=ON;$/.test(line)) {
			skipWritableSchemaBlock = true;
			removedLineCount += 1;
			continue;
		}

		if (/^PRAGMA writable_schema=OFF;$/.test(line)) {
			skipWritableSchemaBlock = false;
			removedLineCount += 1;
			continue;
		}

		if (skipWritableSchemaBlock) {
			removedLineCount += 1;
			continue;
		}

		if (SQLITE_DUMP_LINE_PATTERNS.some((pattern) => pattern.test(line))) {
			removedLineCount += 1;
			continue;
		}

		if (/^INSERT INTO sqlite_schema\b/.test(line)) {
			removedLineCount += 1;
			continue;
		}

		kept.push(line);
	}

	return {
		sql: kept.join("\n"),
		removedLineCount,
	};
}

export function keepInsertStatementsOnly(sql) {
	return sql
		.split(/\r?\n/)
		.filter((line) => /^INSERT INTO\b/.test(line) || line.trim() === "")
		.join("\n");
}

export function stripJsonComments(jsonc) {
	let result = "";
	let inString = false;
	let inLineComment = false;
	let inBlockComment = false;
	let escaping = false;

	for (let i = 0; i < jsonc.length; i += 1) {
		const current = jsonc[i];
		const next = jsonc[i + 1];

		if (inLineComment) {
			if (current === "\n") {
				inLineComment = false;
				result += current;
			}
			continue;
		}

		if (inBlockComment) {
			if (current === "*" && next === "/") {
				inBlockComment = false;
				i += 1;
			}
			continue;
		}

		if (inString) {
			result += current;
			if (escaping) {
				escaping = false;
			} else if (current === "\\") {
				escaping = true;
			} else if (current === "\"") {
				inString = false;
			}
			continue;
		}

		if (current === "\"") {
			inString = true;
			result += current;
			continue;
		}

		if (current === "/" && next === "/") {
			inLineComment = true;
			i += 1;
			continue;
		}

		if (current === "/" && next === "*") {
			inBlockComment = true;
			i += 1;
			continue;
		}

		result += current;
	}

	return result.replace(/,\s*([}\]])/g, "$1");
}

export function parseWranglerConfig(jsonc) {
	return JSON.parse(stripJsonComments(jsonc));
}

export function getD1DatabaseNameFromConfig(config) {
	const firstDatabase = config?.d1_databases?.[0];
	if (!firstDatabase?.database_name) {
		throw new Error("No d1_databases[0].database_name found in Wrangler config");
	}
	return firstDatabase.database_name;
}

export async function getD1DatabaseNameFromConfigFile(configPath) {
	const configText = await readFile(configPath, "utf8");
	return getD1DatabaseNameFromConfig(parseWranglerConfig(configText));
}

function topologicallySortTables(tables, dependencyMap) {
	const sorted = [];
	const visited = new Set();
	const visiting = new Set();

	function visit(table) {
		if (visited.has(table)) return;
		if (visiting.has(table)) return;
		visiting.add(table);

		for (const dependency of dependencyMap.get(table) ?? []) {
			if (tables.includes(dependency)) {
				visit(dependency);
			}
		}

		visiting.delete(table);
		visited.add(table);
		sorted.push(table);
	}

	for (const table of tables) {
		visit(table);
	}

	return sorted.reverse();
}

export function buildResetSqlFromSchema(tables, dependencyMap) {
	const orderedTables = topologicallySortTables(tables, dependencyMap);
	return orderedTables.map((table) => `DELETE FROM "${table}";`).join("\n");
}

export function getResetPlanFromSqliteDatabase(databasePath) {
	const db = new Database(databasePath, { readonly: true });
	try {
		const excludedPrefixes = ["sqlite_", "_emdash_fts_"];
		const excludedTables = new Set(["_emdash_migrations", "_emdash_migrations_lock"]);

		const tableRows = db
			.prepare(
				`
					SELECT name
					FROM sqlite_master
					WHERE type = 'table'
					ORDER BY name
				`,
			)
			.all();

		const tables = tableRows
			.map((row) => row.name)
			.filter(
				(name) =>
					!excludedTables.has(name) &&
					!excludedPrefixes.some((prefix) => name.startsWith(prefix)),
			);

		const dependencyMap = new Map();
		for (const table of tables) {
			const foreignKeys = db.prepare(`PRAGMA foreign_key_list("${table.replaceAll('"', '""')}")`).all();
			dependencyMap.set(
				table,
				foreignKeys
					.map((row) => row.table)
					.filter((dependency) => typeof dependency === "string" && dependency.length > 0),
			);
		}

		return {
			tables,
			dependencyMap,
			sql: buildResetSqlFromSchema(tables, dependencyMap),
		};
	} finally {
		db.close();
	}
}
