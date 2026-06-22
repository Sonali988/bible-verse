import type { Database } from "sql.js";
import type { SqliteSchemaConfig } from "./schemaConfig";

const BOOK_COL_PATTERNS = [
  "book_number",
  "book_id",
  "booknum",
  "book_num",
  "book",
  "b",
] as const;

const CHAPTER_COL_PATTERNS = [
  "chapter_number",
  "chapter",
  "chap",
  "c",
] as const;

const VERSE_COL_PATTERNS = ["verse_number", "verse", "v"] as const;

const TEXT_COL_PATTERNS = [
  "scripture",
  "verse_text",
  "content",
  "text",
  "t",
] as const;

const VERSE_TABLE_PATTERNS = [
  "verses",
  "verse",
  "bible",
  "scripture",
  "scriptures",
  "chapter_verse",
] as const;

export function listSqliteTables(db: Database): string[] {
  const res = db.exec(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
  );
  return (res[0]?.values ?? []).map((row) => String(row[0]));
}

export function listSqliteColumns(db: Database, table: string): string[] {
  const res = db.exec(`PRAGMA table_info(${quoteIdent(table)})`);
  return (res[0]?.values ?? []).map((row) => String(row[1]));
}

function findColumn(
  columns: string[],
  patterns: readonly string[],
): string | undefined {
  const lower = columns.map((c) => c.toLowerCase());
  for (const pattern of patterns) {
    const idx = lower.indexOf(pattern);
    if (idx >= 0) return columns[idx];
  }
  return undefined;
}

function verseTableScore(table: string): number {
  const t = table.toLowerCase();
  const idx = VERSE_TABLE_PATTERNS.indexOf(
    t as (typeof VERSE_TABLE_PATTERNS)[number],
  );
  return idx >= 0 ? VERSE_TABLE_PATTERNS.length - idx : 0;
}

function inferBookIsNumeric(
  db: Database,
  table: string,
  bookColumn: string,
): boolean {
  const col = bookColumn.toLowerCase();
  if (col.includes("id") || col.includes("number") || col === "b") return true;
  if (col === "book") {
    try {
      const res = db.exec(
        `SELECT ${quoteIdent(bookColumn)} FROM ${quoteIdent(table)} LIMIT 1`,
      );
      const sample = res[0]?.values?.[0]?.[0];
      if (typeof sample === "number") return true;
      if (typeof sample === "string" && /^\d+$/.test(sample.trim())) return true;
      return false;
    } catch {
      return false;
    }
  }
  return true;
}

function detectBookNameTable(
  db: Database,
  tables: string[],
): Pick<
  SqliteSchemaConfig,
  "bookTable" | "bookTableIdColumn" | "bookTableNameColumn"
> | null {
  for (const table of tables) {
    const t = table.toLowerCase();
    if (t !== "books" && t !== "book" && t !== "bible_books") continue;
    const cols = listSqliteColumns(db, table);
    const idCol =
      findColumn(cols, ["book_number", "book_id", "id", "number"]) ??
      findColumn(cols, ["book"]);
    const nameCol = findColumn(cols, [
      "book_name",
      "name",
      "title",
      "abbreviation",
    ]);
    if (idCol && nameCol) {
      return {
        bookTable: table,
        bookTableIdColumn: idCol,
        bookTableNameColumn: nameCol,
      };
    }
  }
  return null;
}

/** Best-effort mapping from common Bible SQLite layouts (OpenLP, scrollmapper, MySword-like). */
export function detectSqliteSchema(db: Database): SqliteSchemaConfig | null {
  const tables = listSqliteTables(db);
  let best: { schema: SqliteSchemaConfig; score: number } | null = null;
  const bookMeta = detectBookNameTable(db, tables);

  for (const table of tables) {
    const cols = listSqliteColumns(db, table);
    const bookColumn = findColumn(cols, BOOK_COL_PATTERNS);
    const chapterColumn = findColumn(cols, CHAPTER_COL_PATTERNS);
    const verseColumn = findColumn(cols, VERSE_COL_PATTERNS);
    const textColumn = findColumn(cols, TEXT_COL_PATTERNS);
    if (!bookColumn || !chapterColumn || !verseColumn || !textColumn) continue;

    const schema: SqliteSchemaConfig = {
      verseTable: table,
      bookColumn,
      chapterColumn,
      verseColumn,
      textColumn,
      bookIsNumeric: inferBookIsNumeric(db, table, bookColumn),
      ...bookMeta,
    };

    let score = verseTableScore(table) + 4;
    if (bookMeta) score += 2;
    try {
      db.exec(
        `SELECT ${quoteIdent(bookColumn)} FROM ${quoteIdent(table)} LIMIT 1`,
      );
      score += 1;
    } catch {
      continue;
    }

    if (!best || score > best.score) best = { schema, score };
  }

  return best?.schema ?? null;
}

export function schemaMatchesDatabase(
  db: Database,
  schema: SqliteSchemaConfig,
): boolean {
  const tables = listSqliteTables(db);
  if (!tables.includes(schema.verseTable)) return false;

  const cols = new Set(
    listSqliteColumns(db, schema.verseTable).map((c) => c.toLowerCase()),
  );
  const required = [
    schema.bookColumn,
    schema.chapterColumn,
    schema.verseColumn,
    schema.textColumn,
  ];
  if (!required.every((c) => cols.has(c.toLowerCase()))) return false;

  if (schema.bookTable) {
    if (!tables.includes(schema.bookTable)) return false;
    const bookCols = new Set(
      listSqliteColumns(db, schema.bookTable).map((c) => c.toLowerCase()),
    );
    if (
      schema.bookTableIdColumn &&
      !bookCols.has(schema.bookTableIdColumn.toLowerCase())
    ) {
      return false;
    }
    if (
      schema.bookTableNameColumn &&
      !bookCols.has(schema.bookTableNameColumn.toLowerCase())
    ) {
      return false;
    }
  }

  try {
    db.exec(
      `SELECT ${quoteIdent(schema.bookColumn)} FROM ${quoteIdent(schema.verseTable)} LIMIT 1`,
    );
    return true;
  } catch {
    return false;
  }
}

export function resolveSqliteSchema(
  db: Database,
  configured: SqliteSchemaConfig,
): SqliteSchemaConfig {
  if (schemaMatchesDatabase(db, configured)) return configured;
  const detected = detectSqliteSchema(db);
  if (detected && schemaMatchesDatabase(db, detected)) return detected;
  throw new Error(formatSchemaMismatchMessage(db, configured, detected));
}

export function formatSchemaMismatchMessage(
  db: Database,
  configured: SqliteSchemaConfig,
  detected: SqliteSchemaConfig | null,
): string {
  const tables = listSqliteTables(db);
  const lines = [
    "The SQLite file opened correctly, but its table layout could not be mapped automatically.",
    `Configured verse table: "${configured.verseTable}"${tables.includes(configured.verseTable) ? " (exists, but columns or data may differ)" : " (not found)"}.`,
    `Tables in file: ${tables.length ? tables.join(", ") : "(none)"}.`,
    "Try a standard Bible SQLite database, or upload a different file.",
  ];
  if (detected) {
    lines.push(
      `Suggested mapping: table "${detected.verseTable}" with columns ${detected.bookColumn}, ${detected.chapterColumn}, ${detected.verseColumn}, ${detected.textColumn}.`,
      `Example JSON: ${JSON.stringify(detected)}`,
    );
  }
  return lines.join(" ");
}

function quoteIdent(name: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid SQL identifier: ${name}`);
  }
  return `"${name.replace(/"/g, '""')}"`;
}
