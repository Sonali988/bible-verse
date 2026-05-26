import { STANDARD_BOOKS } from "../books";
import type { BookInfo, BibleProvider } from "../provider";
import type { VerseRef } from "../types";
import type { BibleComVersionConfig } from "./config";
import { fetchMaxVerseInChapter, fetchVerseText } from "./client";

const MAX_CHAPTERS_GUESS = 150;

export class BibleComProvider implements BibleProvider {
  readonly versionLabel: string;
  private readonly config: BibleComVersionConfig;

  constructor(config: BibleComVersionConfig) {
    this.config = config;
    this.versionLabel = config.label;
  }

  isReady(): boolean {
    return true;
  }

  async listBooks(): Promise<BookInfo[]> {
    return STANDARD_BOOKS.map((b) => ({ id: b.id, name: b.name }));
  }

  async listChapters(_bookId: string): Promise<number[]> {
    return Array.from({ length: MAX_CHAPTERS_GUESS }, (_, i) => i + 1);
  }

  async getMaxVerse(bookId: string, chapter: number): Promise<number> {
    try {
      const max = await fetchMaxVerseInChapter(
        { bookId, chapter, verse: 1 },
        this.config,
      );
      return Math.max(0, max);
    } catch {
      return 0;
    }
  }

  async getPassage(ref: VerseRef): Promise<string> {
    return fetchVerseText(ref, this.config);
  }
}
