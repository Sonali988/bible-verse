import type { BibleProvider, VerseSearchHit } from "../bible/provider";
import {
  looksLikeReferenceQuery,
  parseReferenceQuery,
} from "./parseReferenceQuery";

/**
 * Search by shorthand reference (e.g. Jn 3:16) or English text (SQLite).
 */
export async function searchVersesByQuery(
  providerEn: BibleProvider,
  query: string,
  limit = 40,
): Promise<{ hits: VerseSearchHit[]; mode: "reference" | "text" }> {
  const q = query.trim();
  if (!q) return { hits: [], mode: "text" };

  if (looksLikeReferenceQuery(q)) {
    const ref = parseReferenceQuery(q);
    if (!ref) {
      throw new Error(
        `Could not recognize book in “${q}”. Try Gen 1:1, Jn 3:16, or 1thes 2:1.`,
      );
    }
    if (!providerEn.isReady()) {
      throw new Error("English Bible is not ready.");
    }
    const textEn = (await providerEn.getPassage(ref)).trim();
    if (!textEn) {
      return { hits: [], mode: "reference" };
    }
    return { hits: [{ ref, textEn }], mode: "reference" };
  }

  if (!providerEn.isReady() || typeof providerEn.searchEnglish !== "function") {
    throw new Error(
      "Text search needs a SQLite English Bible. Or search by reference (e.g. Jn 3:16).",
    );
  }
  const hits = await providerEn.searchEnglish(q, limit);
  return { hits, mode: "text" };
}
