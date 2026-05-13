import type { VerseRef } from "./types";

export type BookInfo = { id: string; name: string };

export interface BibleProvider {
  readonly versionLabel: string;
  isReady(): boolean;
  listBooks(): Promise<BookInfo[]>;
  listChapters(bookId: string): Promise<number[]>;
  getMaxVerse(bookId: string, chapter: number): Promise<number>;
  getPassage(ref: VerseRef): Promise<string>;
}
