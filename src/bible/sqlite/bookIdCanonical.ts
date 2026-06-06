import { STANDARD_BOOKS, bookNameById } from "../books";

function normalizeBookName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const CANONICAL_ID_BY_NORMALIZED_NAME = new Map<string, string>();
for (const book of STANDARD_BOOKS) {
  CANONICAL_ID_BY_NORMALIZED_NAME.set(normalizeBookName(book.name), book.id);
}

/** Common SQLite export variants that still refer to a standard book id. */
const BOOK_NAME_ALIASES: Record<string, string> = {
  psalm: "19",
  songsofsolomon: "22",
};

export function canonicalBookIdForName(name: string): string | null {
  const normalized = normalizeBookName(name);
  return (
    CANONICAL_ID_BY_NORMALIZED_NAME.get(normalized) ??
    BOOK_NAME_ALIASES[normalized] ??
    null
  );
}

export type BookIdMaps = {
  sqliteToCanonical: Map<string, string>;
  canonicalToSqlite: Map<string, string>;
};

export function buildBookIdMaps(
  sqliteBookIds: string[],
  sqliteBookNames: Map<string, string>,
): BookIdMaps {
  const sqliteToCanonical = new Map<string, string>();
  const canonicalToSqlite = new Map<string, string>();

  for (const sqliteId of sqliteBookIds) {
    const name = sqliteBookNames.get(sqliteId) ?? bookNameById(sqliteId);
    const canonical = canonicalBookIdForName(name) ?? sqliteId;
    sqliteToCanonical.set(sqliteId, canonical);
    canonicalToSqlite.set(canonical, sqliteId);
  }

  return { sqliteToCanonical, canonicalToSqlite };
}

export function toSqliteBookId(
  canonicalId: string,
  maps: BookIdMaps,
): string {
  return maps.canonicalToSqlite.get(canonicalId) ?? canonicalId;
}
