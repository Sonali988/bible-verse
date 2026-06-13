import { BOOK_ID_TO_USFM } from "../bibleCom/usfm";
import type { VerseRef } from "../types";

export function verseRefToPassageId(ref: VerseRef): string {
  const book = BOOK_ID_TO_USFM[ref.bookId];
  if (!book) {
    throw new Error(`No USFM book code for book id ${ref.bookId}`);
  }
  return `${book}.${ref.chapter}.${ref.verse}`;
}

export function chapterRefToPassageId(ref: VerseRef): string {
  const book = BOOK_ID_TO_USFM[ref.bookId];
  if (!book) {
    throw new Error(`No USFM book code for book id ${ref.bookId}`);
  }
  return `${book}.${ref.chapter}`;
}
