import type { Database } from "sql.js";
import type { VerseRef } from "../types";
import type { BookInfo, BibleProvider } from "../provider";
import { bookNameById } from "../books";
import {
  buildBookIdMaps,
  toSqliteBookId,
  type BookIdMaps,
} from "./bookIdCanonical";
import type { SqliteSchemaConfig } from "./schemaConfig";
import { resolveSqliteSchema } from "./schemaInspect";

/** sql.js init result: constructor for in-memory DB instances */
type SqlJsModule = { Database: new (data?: Uint8Array) => Database };

let sqlJsPromise: Promise<SqlJsModule> | null = null;

function resolveInitSqlJs(mod: unknown): (opts?: {
  locateFile?: (file: string) => string;
}) => Promise<SqlJsModule> {
  if (typeof mod === "function") {
    return mod as (opts?: {
      locateFile?: (file: string) => string;
    }) => Promise<SqlJsModule>;
  }
  const m = mod as Record<string, unknown>;
  const d = m.default;
  const fn =
    typeof d === "function"
      ? d
      : d !== null &&
          typeof d === "object" &&
          typeof (d as { default?: unknown }).default === "function"
        ? (d as { default: (...args: unknown[]) => unknown }).default
        : typeof m.initSqlJs === "function"
          ? m.initSqlJs
          : undefined;
  if (typeof fn !== "function") {
    throw new Error(
      "sql.js: initSqlJs is not a function (check Vite / ESM interop).",
    );
  }
  return fn as (opts?: {
    locateFile?: (file: string) => string;
  }) => Promise<SqlJsModule>;
}

async function loadSqlJs(): Promise<SqlJsModule> {
  if (!sqlJsPromise) {
    sqlJsPromise = (async () => {
      const mod = await import("sql.js/dist/sql-wasm-browser.js");
      const wasmUrl = (await import("sql.js/dist/sql-wasm-browser.wasm?url"))
        .default;
      const initSqlJs = resolveInitSqlJs(mod);
      return initSqlJs({ locateFile: () => wasmUrl });
    })();
  }
  return sqlJsPromise;
}

function bindBook(value: string, numeric: boolean): number | string {
  if (numeric) return Number(value);
  return value;
}

export class SqliteBibleProvider implements BibleProvider {
  readonly versionLabel: string;
  private db: Database | null = null;
  private schema: SqliteSchemaConfig;
  private bookNames = new Map<string, string>();
  private bookIdMaps: BookIdMaps = {
    sqliteToCanonical: new Map(),
    canonicalToSqlite: new Map(),
  };

  constructor(versionLabel: string, schema: SqliteSchemaConfig) {
    this.versionLabel = versionLabel;
    this.schema = schema;
  }

  isReady(): boolean {
    return this.db !== null;
  }

  async loadFile(file: File): Promise<SqliteSchemaConfig> {
    const buf = await file.arrayBuffer();
    return this.loadArrayBuffer(buf);
  }

  async loadArrayBuffer(buf: ArrayBuffer): Promise<SqliteSchemaConfig> {
    const SQL = await loadSqlJs();
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.db = new SQL.Database(new Uint8Array(buf));
    this.schema = resolveSqliteSchema(this.db, this.schema);
    await this.hydrateBookNames();
    return this.schema;
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.bookNames.clear();
    this.bookIdMaps = { sqliteToCanonical: new Map(), canonicalToSqlite: new Map() };
  }

  private getDb(): Database {
    if (!this.db) throw new Error("SQLite database not loaded");
    return this.db;
  }

  private async hydrateBookNames(): Promise<void> {
    const db = this.getDb();
    const s = this.schema;
    this.bookNames.clear();
    if (s.bookTable && s.bookTableIdColumn && s.bookTableNameColumn) {
      const q = `SELECT ${quoteIdent(s.bookTableIdColumn)}, ${quoteIdent(s.bookTableNameColumn)} FROM ${quoteIdent(s.bookTable)}`;
      const res = db.exec(q);
      const rows = res[0];
      if (rows?.values) {
        for (const row of rows.values) {
          const id = String(row[0]);
          const name = String(row[1]);
          this.bookNames.set(id, name);
        }
      }
    }
    this.rebuildBookIdMaps();
  }

  private listDistinctSqliteBookIds(): string[] {
    const db = this.getDb();
    const s = this.schema;
    const bookCol = quoteIdent(s.bookColumn);
    const q = `SELECT DISTINCT ${bookCol} FROM ${quoteIdent(s.verseTable)} ORDER BY ${bookCol}`;
    const res = db.exec(q);
    const rows = res[0]?.values ?? [];
    return rows.map((r) => String(r[0]));
  }

  private rebuildBookIdMaps(): void {
    this.bookIdMaps = buildBookIdMaps(
      this.listDistinctSqliteBookIds(),
      this.bookNames,
    );
  }

  private sqliteBookId(canonicalBookId: string): string {
    return toSqliteBookId(canonicalBookId, this.bookIdMaps);
  }

  async listBooks(): Promise<BookInfo[]> {
    const sqliteIds = this.listDistinctSqliteBookIds();
    return sqliteIds.map((sqliteId) => {
      const canonicalId =
        this.bookIdMaps.sqliteToCanonical.get(sqliteId) ?? sqliteId;
      return {
        id: canonicalId,
        name: bookNameById(canonicalId),
      };
    });
  }

  async listChapters(bookId: string): Promise<number[]> {
    const db = this.getDb();
    const s = this.schema;
    const q = `SELECT DISTINCT ${quoteIdent(s.chapterColumn)} FROM ${quoteIdent(s.verseTable)} WHERE ${quoteIdent(s.bookColumn)} = ? ORDER BY ${quoteIdent(s.chapterColumn)}`;
    const stmt = db.prepare(q);
    stmt.bind([bindBook(this.sqliteBookId(bookId), s.bookIsNumeric)]);
    const chapters: number[] = [];
    while (stmt.step()) {
      const row = stmt.get();
      chapters.push(Number(row[0]));
    }
    stmt.free();
    return chapters;
  }

  async getMaxVerse(bookId: string, chapter: number): Promise<number> {
    const db = this.getDb();
    const s = this.schema;
    const q = `SELECT MAX(${quoteIdent(s.verseColumn)}) FROM ${quoteIdent(s.verseTable)} WHERE ${quoteIdent(s.bookColumn)} = ? AND ${quoteIdent(s.chapterColumn)} = ?`;
    const stmt = db.prepare(q);
    stmt.bind([bindBook(this.sqliteBookId(bookId), s.bookIsNumeric), chapter]);
    let max = 0;
    if (stmt.step()) {
      const row = stmt.get();
      max = Number(row[0]) || 0;
    }
    stmt.free();
    return max;
  }

  async getPassage(ref: VerseRef): Promise<string> {
    const db = this.getDb();
    const s = this.schema;
    const q = `SELECT ${quoteIdent(s.textColumn)} FROM ${quoteIdent(s.verseTable)} WHERE ${quoteIdent(s.bookColumn)} = ? AND ${quoteIdent(s.chapterColumn)} = ? AND ${quoteIdent(s.verseColumn)} = ? LIMIT 1`;
    const stmt = db.prepare(q);
    stmt.bind([
      bindBook(this.sqliteBookId(ref.bookId), s.bookIsNumeric),
      ref.chapter,
      ref.verse,
    ]);
    let text = "";
    if (stmt.step()) {
      const row = stmt.get();
      text = String(row[0] ?? "").trim();
    }
    stmt.free();
    return text;
  }
}

function quoteIdent(name: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid SQL identifier: ${name}`);
  }
  return `"${name.replace(/"/g, '""')}"`;
}
