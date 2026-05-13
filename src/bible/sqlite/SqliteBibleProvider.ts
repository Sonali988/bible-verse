import type { Database } from "sql.js";
import type { VerseRef } from "../types";
import type { BookInfo, BibleProvider } from "../provider";
import { bookNameById } from "../books";
import type { SqliteSchemaConfig } from "./schemaConfig";

type SqlJsModule = Awaited<
  ReturnType<(typeof import("sql.js"))["default"]>
>;

let sqlJsPromise: Promise<SqlJsModule> | null = null;

async function loadSqlJs(): Promise<SqlJsModule> {
  if (!sqlJsPromise) {
    sqlJsPromise = (async () => {
      const { default: initSqlJs } = await import("sql.js");
      const wasmUrl = (await import("sql.js/dist/sql-wasm.wasm?url")).default;
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

  constructor(versionLabel: string, schema: SqliteSchemaConfig) {
    this.versionLabel = versionLabel;
    this.schema = schema;
  }

  isReady(): boolean {
    return this.db !== null;
  }

  async loadFile(file: File): Promise<void> {
    const buf = await file.arrayBuffer();
    await this.loadArrayBuffer(buf);
  }

  async loadArrayBuffer(buf: ArrayBuffer): Promise<void> {
    const SQL = await loadSqlJs();
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.db = new SQL.Database(new Uint8Array(buf));
    await this.hydrateBookNames();
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.bookNames.clear();
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
  }

  async listBooks(): Promise<BookInfo[]> {
    const db = this.getDb();
    const s = this.schema;
    const bookCol = quoteIdent(s.bookColumn);
    const q = `SELECT DISTINCT ${bookCol} FROM ${quoteIdent(s.verseTable)} ORDER BY ${bookCol}`;
    const res = db.exec(q);
    const rows = res[0]?.values ?? [];
    const ids = rows.map((r) => String(r[0]));
    return ids.map((id) => ({
      id,
      name: this.bookNames.get(id) ?? bookNameById(id),
    }));
  }

  async listChapters(bookId: string): Promise<number[]> {
    const db = this.getDb();
    const s = this.schema;
    const q = `SELECT DISTINCT ${quoteIdent(s.chapterColumn)} FROM ${quoteIdent(s.verseTable)} WHERE ${quoteIdent(s.bookColumn)} = ? ORDER BY ${quoteIdent(s.chapterColumn)}`;
    const stmt = db.prepare(q);
    stmt.bind([bindBook(bookId, s.bookIsNumeric)]);
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
    stmt.bind([bindBook(bookId, s.bookIsNumeric), chapter]);
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
    const q = `SELECT ${quoteIdent(s.verseColumn)}, ${quoteIdent(s.textColumn)} FROM ${quoteIdent(s.verseTable)} WHERE ${quoteIdent(s.bookColumn)} = ? AND ${quoteIdent(s.chapterColumn)} = ? AND ${quoteIdent(s.verseColumn)} >= ? AND ${quoteIdent(s.verseColumn)} <= ? ORDER BY ${quoteIdent(s.verseColumn)}`;
    const stmt = db.prepare(q);
    stmt.bind([
      bindBook(ref.bookId, s.bookIsNumeric),
      ref.chapter,
      ref.verseStart,
      ref.verseEnd,
    ]);
    const parts: string[] = [];
    while (stmt.step()) {
      const row = stmt.get();
      const verseNum = Number(row[0]);
      const text = String(row[1] ?? "").trim();
      if (ref.verseStart === ref.verseEnd) {
        parts.push(text);
      } else {
        parts.push(`${verseNum} ${text}`);
      }
    }
    stmt.free();
    return parts.join(" ").trim();
  }
}

function quoteIdent(name: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid SQL identifier: ${name}`);
  }
  return `"${name.replace(/"/g, '""')}"`;
}
