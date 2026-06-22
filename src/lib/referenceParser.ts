import { STANDARD_BOOKS, hindiBookNameById } from "../bible/books";
import type { VerseRef } from "../bible/types";

/** Migrates legacy `verseStart` / `verseEnd` persisted refs to a single verse. */
export function normalizeVerseRef(raw: unknown): VerseRef | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const bookId = String(r.bookId ?? "");
  const chapter = Number(r.chapter);
  const verse = Number(r.verse ?? r.verseStart ?? 0);
  if (!bookId || !chapter || !verse) return null;
  return { bookId, chapter, verse };
}

function bookDisplayName(bookId: string): string {
  return STANDARD_BOOKS.find((b) => b.id === bookId)?.name ?? `Book ${bookId}`;
}

export function formatReference(ref: VerseRef): string {
  return `${bookDisplayName(ref.bookId)} ${ref.chapter}:${ref.verse}`;
}

/** e.g. `Luke 1:4–5` when start &lt; end; single verse matches {@link formatReference}. */
export function formatReferenceRange(
  bookId: string,
  chapter: number,
  verseStart: number,
  verseEnd: number,
): string {
  const name = bookDisplayName(bookId);
  const start = Math.min(verseStart, verseEnd);
  const end = Math.max(verseStart, verseEnd);
  if (end <= start) return `${name} ${chapter}:${start}`;
  return `${name} ${chapter}:${start}–${end}`;
}

/** Hindi book name + chapter:verse, e.g. `गलातियों 3:5`. */
export function formatHindiReference(ref: VerseRef): string {
  const name = hindiBookNameById(ref.bookId);
  return `${name} ${ref.chapter}:${ref.verse}`;
}
