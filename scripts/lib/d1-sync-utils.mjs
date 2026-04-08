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
	const excludedTables = new Set(["_emdash_migrations", "_emdash_migrations_lock"]);
	return sql
		.split(/\r?\n/)
		.filter((line) => {
			if (line.trim() === "") return true;
			const match = line.match(/^INSERT INTO\s+("?)([A-Za-z0-9_]+)\1\b/);
			if (!match) return false;
			return !excludedTables.has(match[2]);
		})
		.join("\n");
}

export function splitSqlStatements(sql) {
	const statements = [];
	let current = "";
	let inSingleQuote = false;
	let inDoubleQuote = false;

	for (let i = 0; i < sql.length; i += 1) {
		const char = sql[i];
		const next = sql[i + 1];
		current += char;

		if (inSingleQuote) {
			if (char === "'" && next === "'") {
				current += next;
				i += 1;
				continue;
			}
			if (char === "'") {
				inSingleQuote = false;
			}
			continue;
		}

		if (inDoubleQuote) {
			if (char === "\"") {
				inDoubleQuote = false;
			}
			continue;
		}

		if (char === "'") {
			inSingleQuote = true;
			continue;
		}

		if (char === "\"") {
			inDoubleQuote = true;
			continue;
		}

		if (char === ";") {
			const trimmed = current.trim();
			if (trimmed) {
				statements.push(trimmed);
			}
			current = "";
		}
	}

	const trailing = current.trim();
	if (trailing) {
		statements.push(trailing);
	}

	return statements;
}

export function chunkSqlStatements(statements, maxBatchChars = 4000, maxBatchStatements = 20) {
	const batches = [];
	let currentBatch = [];
	let currentLength = 0;

	for (const statement of statements) {
		const normalized = statement.endsWith(";") ? statement : `${statement};`;
		const nextLength = currentLength + normalized.length + (currentBatch.length > 0 ? 1 : 0);
		const wouldOverflow =
			currentBatch.length >= maxBatchStatements ||
			(currentBatch.length > 0 && nextLength > maxBatchChars);

		if (wouldOverflow) {
			batches.push(currentBatch.join("\n"));
			currentBatch = [normalized];
			currentLength = normalized.length;
			continue;
		}

		currentBatch.push(normalized);
		currentLength = nextLength;
	}

	if (currentBatch.length > 0) {
		batches.push(currentBatch.join("\n"));
	}

	return batches;
}

export function isDuplicateConstraintError(errorLike) {
	const message =
		errorLike instanceof Error
			? `${errorLike.message}\n${errorLike.stderr ?? ""}\n${errorLike.stdout ?? ""}`
			: String(errorLike);

	return (
		message.includes("UNIQUE constraint failed") ||
		message.includes("SQLITE_CONSTRAINT_PRIMARYKEY") ||
		message.includes("SQLITE_CONSTRAINT_UNIQUE")
	);
}

function splitTopLevelCommaSeparated(input) {
	const parts = [];
	let current = "";
	let depth = 0;
	let inSingleQuote = false;
	let inDoubleQuote = false;

	for (let i = 0; i < input.length; i += 1) {
		const char = input[i];
		const next = input[i + 1];

		current += char;

		if (inSingleQuote) {
			if (char === "'" && next === "'") {
				current += next;
				i += 1;
				continue;
			}
			if (char === "'") inSingleQuote = false;
			continue;
		}

		if (inDoubleQuote) {
			if (char === "\"") inDoubleQuote = false;
			continue;
		}

		if (char === "'") {
			inSingleQuote = true;
			continue;
		}

		if (char === "\"") {
			inDoubleQuote = true;
			continue;
		}

		if (char === "(") {
			depth += 1;
			continue;
		}

		if (char === ")") {
			depth -= 1;
			continue;
		}

		if (char === "," && depth === 0) {
			parts.push(current.slice(0, -1).trim());
			current = "";
		}
	}

	if (current.trim()) {
		parts.push(current.trim());
	}

	return parts;
}

function isColumnDefinition(part) {
	return /^"[^"]+"\s+/u.test(part) || /^[A-Za-z_][A-Za-z0-9_]*\s+/u.test(part);
}

function getColumnNameFromDefinition(part) {
	const quoted = part.match(/^"([^"]+)"/u);
	if (quoted) return quoted[1];
	const bare = part.match(/^([A-Za-z_][A-Za-z0-9_]*)/u);
	return bare ? bare[1] : null;
}

function parseCreateTableSql(createSql) {
	const match = createSql.match(/CREATE TABLE(?: IF NOT EXISTS)?\s+"?([^"( ]+)"?\s*\(([\s\S]+)\)$/u);
	if (!match) return null;
	const [, tableName, body] = match;
	const parts = splitTopLevelCommaSeparated(body);
	const columnDefinitions = parts.filter(isColumnDefinition);
	const columns = new Map();

	for (const definition of columnDefinitions) {
		const name = getColumnNameFromDefinition(definition);
		if (name) columns.set(name, definition);
	}

	return {
		tableName,
		createSql: `${createSql};`,
		columns,
	};
}

export function getAdditiveSchemaSyncPlan(localDbPath, remoteBackupSql) {
	const localDb = new Database(localDbPath, { readonly: true });
	try {
		const localRows = getUserTableRows(localDb);
		const localTables = new Map();

		for (const row of localRows) {
			const parsed = parseCreateTableSql(row.sql);
			if (parsed) {
				localTables.set(parsed.tableName, parsed);
			}
		}

		const remoteTables = new Map();
		for (const statement of splitSqlStatements(remoteBackupSql)) {
			if (!statement.startsWith("CREATE TABLE IF NOT EXISTS")) continue;
			const parsed = parseCreateTableSql(statement.replace(/;$/, ""));
			if (parsed) {
				remoteTables.set(parsed.tableName, parsed);
			}
		}

		const statements = [];

		for (const [tableName, localTable] of localTables) {
			const remoteTable = remoteTables.get(tableName);

			if (!remoteTable) {
				statements.push(localTable.createSql);
				continue;
			}

			for (const [columnName, definition] of localTable.columns) {
				if (!remoteTable.columns.has(columnName)) {
					statements.push(`ALTER TABLE "${tableName}" ADD COLUMN ${definition};`);
				}
			}
		}

		return {
			statements,
			sql: statements.join("\n"),
		};
	} finally {
		localDb.close();
	}
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

function getUserTableRows(database) {
	return database
		.prepare(
			`
				SELECT name, sql
				FROM sqlite_master
				WHERE type = 'table'
				ORDER BY name
			`,
		)
		.all()
		.filter((row) => typeof row.name === "string")
		.filter((row) => !row.name.startsWith("sqlite_"))
		.filter((row) => !row.name.startsWith("_emdash_fts_"))
		.filter((row) => !(typeof row.sql === "string" && row.sql.startsWith("CREATE VIRTUAL TABLE")));
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
		const excludedTables = new Set(["_emdash_migrations", "_emdash_migrations_lock"]);
		const tables = getUserTableRows(db)
			.map((row) => row.name)
			.filter((name) => !excludedTables.has(name));

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

export function getBackupTableNamesFromSqliteDatabase(databasePath) {
	const db = new Database(databasePath, { readonly: true });
	try {
		return getUserTableRows(db).map((row) => row.name);
	} finally {
		db.close();
	}
}
