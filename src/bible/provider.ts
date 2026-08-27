import type { VerseRef } from "./types";

export type BookInfo = { id: string; name: string };

export type VerseSearchHit = {
  ref: VerseRef;
  textEn: string;
};

export interface BibleProvider {
  readonly versionLabel: string;
  isReady(): boolean;
  listBooks(): Promise<BookInfo[]>;
  listChapters(bookId: string): Promise<number[]>;
  getMaxVerse(bookId: string, chapter: number): Promise<number>;
  getPassage(ref: VerseRef): Promise<string>;
  /**
   * Optional English full-text search (SQLite). Absent on API-only providers.
   */
  searchEnglish?(query: string, limit?: number): Promise<VerseSearchHit[]>;
}
