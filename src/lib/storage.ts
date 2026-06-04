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
import {
  normalizeEnglishSqliteVersionId,
  type EnglishSqliteVersionId,
} from "../config/englishSqliteVersions";

const K_PAGES = "bvc:pages";
const K_CARD_LAYOUT = "bvc:cardLayout";
const K_RESOLUME_LAYOUT = "bvc:resolumeLayout";
const K_TYPO = "bvc:typography";
const K_RESOLUME_TYPO = "bvc:resolumeTypography";
const K_SCHEMA_EN = "bvc:schemaEn";
const K_SCHEMA_HI = "bvc:schemaHi";
const K_VERSE_BLOCK_ORDER = "bvc:verseBlockOrder";
const K_USE_BIBLE_COM_EN = "bvc:useBibleComEn";
const K_USE_BIBLE_COM_HI = "bvc:useBibleComHi";
const K_ENGLISH_SQLITE_VERSION = "bvc:englishSqliteVersionId";
const K_BG_DATA_URL = "bvc:bgDataUrl";

/** Custom card background (data URL from file upload). */
export function loadBackgroundDataUrl(): string | null {
  try {
    const raw = localStorage.getItem(K_BG_DATA_URL);
    return raw && raw.trim().length > 0 ? raw : null;
  } catch {
    return null;
  }
}

/** @returns false if the image could not be stored (e.g. localStorage quota). */
export function saveBackgroundDataUrl(url: string | null): boolean {
  try {
    if (!url?.trim()) {
      localStorage.removeItem(K_BG_DATA_URL);
      return true;
    }
    localStorage.setItem(K_BG_DATA_URL, url);
    return true;
  } catch (e) {
    console.warn(
      "Could not save background image to browser storage (file may be too large).",
      e,
    );
    return false;
  }
}

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
  useBibleComEn: boolean;
  useBibleComHi: boolean;
  englishSqliteVersionId: EnglishSqliteVersionId;
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
    const useBibleComEnRaw = localStorage.getItem(K_USE_BIBLE_COM_EN);
    const useBibleComHiRaw = localStorage.getItem(K_USE_BIBLE_COM_HI);
    const useBibleComEn =
      useBibleComEnRaw != null ? JSON.parse(useBibleComEnRaw) === true : undefined;
    const useBibleComHi =
      useBibleComHiRaw != null ? JSON.parse(useBibleComHiRaw) === true : undefined;
    const englishSqliteVersionRaw = localStorage.getItem(K_ENGLISH_SQLITE_VERSION);
    const englishSqliteVersionId =
      englishSqliteVersionRaw != null
        ? normalizeEnglishSqliteVersionId(englishSqliteVersionRaw)
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
      useBibleComEn,
      useBibleComHi,
      englishSqliteVersionId,
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
  localStorage.setItem(K_USE_BIBLE_COM_EN, JSON.stringify(state.useBibleComEn));
  localStorage.setItem(K_USE_BIBLE_COM_HI, JSON.stringify(state.useBibleComHi));
  localStorage.setItem(
    K_ENGLISH_SQLITE_VERSION,
    state.englishSqliteVersionId,
  );
}

export { DEFAULT_VERSE_BLOCK_ORDER };
