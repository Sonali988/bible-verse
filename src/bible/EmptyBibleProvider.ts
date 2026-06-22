import type { VerseRef } from "./types";
import type { BookInfo, BibleProvider } from "./provider";

/** Until bundled/uploaded SQLite is ready — no verses. */
export class EmptyBibleProvider implements BibleProvider {
  readonly versionLabel: string;

  constructor(versionLabel: string) {
    this.versionLabel = versionLabel;
  }

  isReady(): boolean {
    return false;
  }

  async listBooks(): Promise<BookInfo[]> {
    return [];
  }

  async listChapters(_bookId: string): Promise<number[]> {
    return [];
  }

  async getMaxVerse(_bookId: string, _chapter: number): Promise<number> {
    return 0;
  }

  async getPassage(_ref: VerseRef): Promise<string> {
    return "";
  }
}
