import type { LayoutSpec, Rect } from "../bible/types";

export type VerseBlockOrder = "hi-first" | "en-first";

export const DEFAULT_VERSE_BLOCK_ORDER: VerseBlockOrder = "hi-first";

export function normalizeVerseBlockOrder(raw: unknown): VerseBlockOrder {
  return raw === "en-first" ? "en-first" : "hi-first";
}

/** Upper verse slot in layout (bodyHi rect); lower slot is bodyEn. */
export function verseBodyRect(
  layout: LayoutSpec,
  script: "hi" | "en",
  order: VerseBlockOrder,
): Rect {
  const upper = layout.bodyHi;
  const lower = layout.bodyEn;
  if (order === "hi-first") {
    return script === "hi" ? upper : lower;
  }
  return script === "en" ? upper : lower;
}

export function verseTitleRect(
  layout: LayoutSpec,
  script: "hi" | "en",
  order: VerseBlockOrder,
): Rect {
  const upper = layout.titleHi;
  const lower = layout.titleEn;
  if (order === "hi-first") {
    return script === "hi" ? upper : lower;
  }
  return script === "en" ? upper : lower;
}

export type LiveCardBlockKind = "titleHi" | "bodyHi" | "titleEn" | "bodyEn";

export function liveCardBlockSequence(order: VerseBlockOrder): LiveCardBlockKind[] {
  return order === "en-first"
    ? ["titleEn", "bodyEn", "titleHi", "bodyHi"]
    : ["titleHi", "bodyHi", "titleEn", "bodyEn"];
}

export function liveCardRect(
  layout: LayoutSpec,
  kind: LiveCardBlockKind,
  order: VerseBlockOrder,
): Rect {
  switch (kind) {
    case "titleHi":
      return verseTitleRect(layout, "hi", order);
    case "titleEn":
      return verseTitleRect(layout, "en", order);
    case "bodyHi":
      return verseBodyRect(layout, "hi", order);
    case "bodyEn":
      return verseBodyRect(layout, "en", order);
  }
}
