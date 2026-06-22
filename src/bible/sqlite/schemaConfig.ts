/**
 * Maps your SQLite verse table to queries. Adjust table/column names to match your file
 * (OpenLP-style, MySword export, custom, etc.).
 */
export type SqliteSchemaConfig = {
  /** Main table containing verse rows */
  verseTable: string;
  /** Column for book identifier: numeric 1–66 or string id depending on DB */
  bookColumn: string;
  chapterColumn: string;
  verseColumn: string;
  textColumn: string;
  /**
   * If true, `bookColumn` is compared as INTEGER. If false, compared as TEXT (bind string).
   */
  bookIsNumeric: boolean;
  /**
   * Optional `SELECT idColumn, nameColumn FROM bookTable` for custom book names.
   * If omitted, app uses built-in Protestant book names for ids 1–66.
   */
  bookTable?: string;
  bookTableIdColumn?: string;
  bookTableNameColumn?: string;
};

export const defaultSqliteSchema = (): SqliteSchemaConfig => ({
  verseTable: "verses",
  bookColumn: "book_number",
  chapterColumn: "chapter",
  verseColumn: "verse",
  textColumn: "text",
  bookIsNumeric: true,
});
