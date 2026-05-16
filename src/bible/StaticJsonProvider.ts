import type { VerseRef } from "./types";
import type { BookInfo, BibleProvider } from "./provider";
import { STANDARD_BOOKS } from "./books";

const SAMPLE: Record<string, Record<number, Record<number, string>>> = {
  "43": {
    3: {
      16: "For God so loved the world that He gave His only begotten Son, that whoever believes in Him should not perish but have everlasting life.",
    },
  },
};

const SAMPLE_HI: Record<string, Record<number, Record<number, string>>> = {
  "43": {
    3: {
      16: "क्योंकि परमेश्वर ने जगत से ऐसा प्रेम किया कि उसने अपना एकलौता पुत्र दिया, ताकि जो कोई उस पर विश्वास करे, वह नाश न हो, परन्तु अनन्त जीवन पाए।",
    },
  },
};

/** Dev / offline stub; same shape as real providers. */
export class StaticJsonProvider implements BibleProvider {
  readonly versionLabel: string;
  private readonly data: typeof SAMPLE;

  constructor(versionLabel: string, lang: "en" | "hi" = "en") {
    this.versionLabel = versionLabel;
    this.data = lang === "hi" ? SAMPLE_HI : SAMPLE;
  }

  isReady(): boolean {
    return true;
  }

  async listBooks(): Promise<BookInfo[]> {
    return STANDARD_BOOKS.map((b) => ({ id: b.id, name: b.name }));
  }

  async listChapters(bookId: string): Promise<number[]> {
    const book = this.data[bookId];
    if (!book) return [];
    return Object.keys(book)
      .map(Number)
      .sort((a, b) => a - b);
  }

  async getMaxVerse(bookId: string, chapter: number): Promise<number> {
    const book = this.data[bookId];
    if (!book) return 0;
    const ch = book[chapter];
    if (!ch) return 0;
    return Math.max(0, ...Object.keys(ch).map(Number));
  }

  async getPassage(ref: VerseRef): Promise<string> {
    return (this.data[ref.bookId]?.[ref.chapter]?.[ref.verse] ?? "").trim();
  }
}
