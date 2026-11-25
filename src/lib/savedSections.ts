import type { VersePage } from "../bible/types";
import { computeAutoFitBodyFontOverrides } from "./fitVerseBodyFont";
import { newId } from "./id";
import { normalizeVerseRef } from "./referenceParser";
import type { VerseBlockOrder } from "./verseBlockOrder";
import type { LayoutSpec, TypographySpec } from "../bible/types";

export type SavedSection = {
  id: string;
  name: string;
  pages: VersePage[];
  createdAt: number;
};

type QueueDesign = {
  cardLayout: LayoutSpec;
  typography: TypographySpec;
  resolumeLayout: LayoutSpec;
  resolumeTypography: TypographySpec;
  verseBlockOrder: VerseBlockOrder;
};

function normalizePage(
  raw: VersePage,
  legacyEnLabel: string,
  legacyHiLabel: string,
): VersePage | null {
  const ref = normalizeVerseRef(raw.ref);
  if (!ref) return null;
  return {
    ...raw,
    ref,
    versionLabelEn: raw.versionLabelEn ?? legacyEnLabel,
    versionLabelHi: raw.versionLabelHi ?? legacyHiLabel,
  };
}

export function normalizeSavedSections(
  raw: unknown,
  legacyEnLabel: string,
  legacyHiLabel: string,
): SavedSection[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedSection[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as SavedSection;
    if (typeof row.id !== "string" || !row.id.trim()) continue;
    const name =
      typeof row.name === "string" && row.name.trim()
        ? row.name.trim().slice(0, 120)
        : "Saved";
    const createdAt =
      typeof row.createdAt === "number" && Number.isFinite(row.createdAt)
        ? row.createdAt
        : Date.now();
    const pages = Array.isArray(row.pages)
      ? row.pages
          .map((p) => normalizePage(p as VersePage, legacyEnLabel, legacyHiLabel))
          .filter((p): p is VersePage => p !== null)
      : [];
    out.push({ id: row.id, name, pages, createdAt });
  }
  return out.sort((a, b) => a.createdAt - b.createdAt);
}

export function createSavedSection(name: string): SavedSection {
  const trimmed = name.trim().slice(0, 120) || "Saved verses";
  return {
    id: newId(),
    name: trimmed,
    pages: [],
    createdAt: Date.now(),
  };
}

/** Copy a saved card into the active queue with a new id and refreshed auto-fit sizes. */
export function copyVersePageToQueue(
  source: VersePage,
  design: QueueDesign,
): VersePage {
  const base: VersePage = {
    ...source,
    highlightsEn: [...source.highlightsEn],
    highlightsHi: [...source.highlightsHi],
    id: newId(),
  };
  return {
    ...base,
    typographySizes: computeAutoFitBodyFontOverrides(
      base,
      design.cardLayout,
      design.typography,
      design.verseBlockOrder,
    ),
    resolumeTypographySizes: computeAutoFitBodyFontOverrides(
      base,
      design.resolumeLayout,
      design.resolumeTypography,
      design.verseBlockOrder,
      "resolume",
    ),
  };
}