import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

import {
	getAdditiveSchemaSyncPlan,
	buildResetSqlFromSchema,
	chunkSqlStatements,
	getBackupTableNamesFromSqliteDatabase,
	getD1DatabaseNameFromConfig,
	isDuplicateConstraintError,
	keepInsertStatementsOnly,
	parseWranglerConfig,
	sanitizeSqliteDump,
	splitSqlStatements,
} from "../../scripts/lib/d1-sync-utils.mjs";

describe("sanitizeSqliteDump", () => {
	it("removes transaction and sqlite_schema statements that D1 rejects", () => {
		const input = [
			"PRAGMA foreign_keys=OFF;",
			"BEGIN TRANSACTION;",
			"CREATE TABLE test (id integer primary key);",
			"INSERT INTO test VALUES(1);",
			"PRAGMA writable_schema=ON;",
			"INSERT INTO sqlite_schema(type,name,tbl_name,rootpage,sql)VALUES('table','x','x',0,'CREATE VIRTUAL TABLE x USING fts5(content)');",
			"CREATE TABLE x_data(id INTEGER PRIMARY KEY, block BLOB);",
			"PRAGMA writable_schema=OFF;",
			"COMMIT;",
		].join("\n");

		const result = sanitizeSqliteDump(input);

		expect(result.sql).toContain("CREATE TABLE test");
		expect(result.sql).toContain("INSERT INTO test VALUES(1);");
		expect(result.sql).not.toContain("BEGIN TRANSACTION");
		expect(result.sql).not.toContain("COMMIT");
		expect(result.sql).not.toContain("sqlite_schema");
		expect(result.sql).not.toContain("writable_schema");
		expect(result.sql).not.toContain("CREATE TABLE x_data");
		expect(result.removedLineCount).toBe(7);
	});
});

describe("parseWranglerConfig", () => {
	it("parses jsonc and returns the first D1 database name", () => {
		const input = `
			// comment
			{
				"$schema": "https://example.com/schema.json",
				"d1_databases": [
					{
						"binding": "DB",
						"database_name": "emdash-property-web-builder",
					},
				],
			}
		`;

		const config = parseWranglerConfig(input);

		expect(getD1DatabaseNameFromConfig(config)).toBe("emdash-property-web-builder");
	});
});

describe("keepInsertStatementsOnly", () => {
	it("keeps only insert statements for data-only imports", () => {
		const input = [
			"CREATE TABLE test (id integer primary key);",
			"INSERT INTO test VALUES(1);",
			"INSERT INTO _emdash_migrations VALUES('001_initial','2026-04-05T08:30:03.925Z');",
			"INSERT INTO _emdash_migrations_lock VALUES('migration_lock',0);",
			"CREATE INDEX idx_test_id ON test(id);",
			"INSERT INTO test VALUES(2);",
		].join("\n");

		expect(keepInsertStatementsOnly(input)).toBe(["INSERT INTO test VALUES(1);", "INSERT INTO test VALUES(2);"].join("\n"));
	});
});

describe("splitSqlStatements", () => {
	it("splits SQL safely without breaking on semicolons inside quoted strings", () => {
		const sql = [
			"INSERT INTO posts VALUES('hello;world');",
			'INSERT INTO config VALUES("double;quoted");',
			"DELETE FROM posts;",
		].join("\n");

		expect(splitSqlStatements(sql)).toEqual([
			"INSERT INTO posts VALUES('hello;world');",
			'INSERT INTO config VALUES("double;quoted");',
			"DELETE FROM posts;",
		]);
	});
});

describe("chunkSqlStatements", () => {
	it("groups statements into bounded command batches", () => {
		const statements = [
			"INSERT INTO a VALUES(1);",
			"INSERT INTO a VALUES(2);",
			"INSERT INTO a VALUES(3);",
		];

		expect(chunkSqlStatements(statements, 30, 2)).toEqual([
			["INSERT INTO a VALUES(1);"].join("\n"),
			["INSERT INTO a VALUES(2);"].join("\n"),
			["INSERT INTO a VALUES(3);"].join("\n"),
		]);
	});
});

describe("buildResetSqlFromSchema", () => {
	it("orders deletes from children to parents", () => {
		const tables = ["parent", "child", "grandchild"];
		const dependencyMap = new Map([
			["parent", []],
			["child", ["parent"]],
			["grandchild", ["child"]],
		]);

		expect(buildResetSqlFromSchema(tables, dependencyMap)).toBe(
			['DELETE FROM "grandchild";', 'DELETE FROM "child";', 'DELETE FROM "parent";'].join("\n"),
		);
	});
});

describe("getBackupTableNamesFromSqliteDatabase", () => {
	it("excludes FTS virtual and shadow tables from backup exports", () => {
		const tempDir = mkdtempSync(join(tmpdir(), "d1-sync-utils-"));
		const dbPath = join(tempDir, "backup-test.db");
		const db = new Database(dbPath);

		try {
			db.exec(`
				CREATE TABLE posts (id TEXT PRIMARY KEY);
				CREATE TABLE _emdash_migrations (name TEXT PRIMARY KEY);
				CREATE VIRTUAL TABLE _emdash_fts_posts USING fts5(content);
			`);

			expect(getBackupTableNamesFromSqliteDatabase(dbPath)).toEqual(["_emdash_migrations", "posts"]);
		} finally {
			db.close();
			rmSync(tempDir, { recursive: true, force: true });
		}
	});
});

describe("getAdditiveSchemaSyncPlan", () => {
	it("generates ALTER TABLE statements for columns missing from the remote backup schema", () => {
		const tempDir = mkdtempSync(join(tmpdir(), "d1-schema-sync-"));
		const dbPath = join(tempDir, "local.db");
		const db = new Database(dbPath);

		try {
			db.exec(`
				CREATE TABLE ec_pages (
					id TEXT PRIMARY KEY,
					title TEXT,
					featured_section_heading TEXT
				);
			`);

			const remoteBackupSql = `
				CREATE TABLE IF NOT EXISTS "ec_pages" ("id" text primary key, "title" text);
				INSERT INTO ec_pages VALUES ('1', 'Home');
			`;

			const plan = getAdditiveSchemaSyncPlan(dbPath, remoteBackupSql);

			expect(plan.statements).toEqual([
				'ALTER TABLE "ec_pages" ADD COLUMN featured_section_heading TEXT;',
			]);
		} finally {
			db.close();
			rmSync(tempDir, { recursive: true, force: true });
		}
	});
});

describe("isDuplicateConstraintError", () => {
	it("detects duplicate-key style D1 import failures", () => {
		expect(isDuplicateConstraintError("UNIQUE constraint failed: _emdash_migrations.name")).toBe(true);
		expect(isDuplicateConstraintError("SQLITE_CONSTRAINT_PRIMARYKEY")).toBe(true);
		expect(isDuplicateConstraintError("some other failure")).toBe(false);
	});
});
