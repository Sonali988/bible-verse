import {
  cloneLayout,
  type LayoutSpec,
  type TypographySpec,
  type VersePage,
} from "../bible/types";
import {
  DEFAULT_VERSE_BLOCK_ORDER,
  normalizeVerseBlockOrder,
  type VerseBlockOrder,
} from "./verseBlockOrder";
import { normalizeVerseRef } from "./referenceParser";
import type { SqliteSchemaConfig } from "../bible/sqlite/schemaConfig";

const K_PAGES = "bvc:pages";
const K_CARD_LAYOUT = "bvc:cardLayout";
const K_RESOLUME_LAYOUT = "bvc:resolumeLayout";
const K_TYPO = "bvc:typography";
const K_RESOLUME_TYPO = "bvc:resolumeTypography";
const K_SCHEMA_EN = "bvc:schemaEn";
const K_SCHEMA_HI = "bvc:schemaHi";
const K_VERSE_BLOCK_ORDER = "bvc:verseBlockOrder";

function isValidLayout(value: unknown): value is LayoutSpec {
  if (!value || typeof value !== "object") return false;
  const l = value as LayoutSpec;
  if (typeof l.width !== "number" || l.width < 100) return false;
  if (typeof l.height !== "number" || l.height < 100) return false;
  const rects = [l.titleEn, l.bodyEn, l.titleHi, l.bodyHi];
  for (const r of rects) {
    if (!r || typeof r.x !== "number" || typeof r.width !== "number") return false;
  }
  return true;
}

export type PersistedState = {
  pages: VersePage[];
  cardLayout: LayoutSpec;
  resolumeLayout: LayoutSpec;
  typography: TypographySpec;
  resolumeTypography: TypographySpec;
  schemaEn: SqliteSchemaConfig;
  schemaHi: SqliteSchemaConfig;
  verseBlockOrder: VerseBlockOrder;
};

export function loadPersisted(): Partial<PersistedState> {
  try {
    localStorage.removeItem("bvc:layout");
    const pagesRaw = JSON.parse(
      localStorage.getItem(K_PAGES) ?? "null",
    ) as VersePage[] | null;
    const pages = pagesRaw
      ?.map((p) => {
        const ref = normalizeVerseRef(p.ref);
        return ref ? { ...p, ref } : null;
      })
      .filter((p): p is VersePage => p !== null);
    const cardLayoutRaw = JSON.parse(
      localStorage.getItem(K_CARD_LAYOUT) ?? "null",
    );
    const cardLayout = isValidLayout(cardLayoutRaw)
      ? cloneLayout(cardLayoutRaw)
      : undefined;
    const resolumeLayoutRaw = JSON.parse(
      localStorage.getItem(K_RESOLUME_LAYOUT) ?? "null",
    );
    const resolumeLayout = isValidLayout(resolumeLayoutRaw)
      ? cloneLayout(resolumeLayoutRaw)
      : undefined;
    const typography = JSON.parse(
      localStorage.getItem(K_TYPO) ?? "null",
    ) as TypographySpec | null;
    const resolumeTypography = JSON.parse(
      localStorage.getItem(K_RESOLUME_TYPO) ?? "null",
    ) as TypographySpec | null;
    const schemaEn = JSON.parse(
      localStorage.getItem(K_SCHEMA_EN) ?? "null",
    ) as SqliteSchemaConfig | null;
    const schemaHi = JSON.parse(
      localStorage.getItem(K_SCHEMA_HI) ?? "null",
    ) as SqliteSchemaConfig | null;
    const verseBlockOrderRaw = localStorage.getItem(K_VERSE_BLOCK_ORDER);
    const verseBlockOrder =
      verseBlockOrderRaw != null
        ? normalizeVerseBlockOrder(JSON.parse(verseBlockOrderRaw))
        : undefined;

    return {
      pages: pages ?? undefined,
      cardLayout,
      resolumeLayout,
      typography: typography ?? undefined,
      resolumeTypography: resolumeTypography ?? undefined,
      schemaEn: schemaEn ?? undefined,
      schemaHi: schemaHi ?? undefined,
      verseBlockOrder,
    };
  } catch {
    return {};
  }
}

export function savePersisted(state: PersistedState): void {
  localStorage.setItem(K_PAGES, JSON.stringify(state.pages));
  localStorage.setItem(K_CARD_LAYOUT, JSON.stringify(state.cardLayout));
  localStorage.setItem(K_RESOLUME_LAYOUT, JSON.stringify(state.resolumeLayout));
  localStorage.setItem(K_TYPO, JSON.stringify(state.typography));
  localStorage.setItem(K_RESOLUME_TYPO, JSON.stringify(state.resolumeTypography));
  localStorage.setItem(K_SCHEMA_EN, JSON.stringify(state.schemaEn));
  localStorage.setItem(K_SCHEMA_HI, JSON.stringify(state.schemaHi));
  localStorage.setItem(K_VERSE_BLOCK_ORDER, JSON.stringify(state.verseBlockOrder));
}

export { DEFAULT_VERSE_BLOCK_ORDER };
