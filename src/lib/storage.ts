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
  englishSqliteVersion,
  normalizeEnglishSqliteVersionId,
  type EnglishSqliteVersionId,
} from "../config/englishSqliteVersions";
import {
  hindiSourceLabel,
  normalizeHindiSourceId,
  type HindiSourceId,
} from "../config/hindiSources";
import {
  fetchSharedState,
  remoteStorageEnabled,
  saveSharedState,
  type SharedStatePayload,
} from "./remoteStorage";

const K_PAGES = "bvc:pages";
const K_CARD_LAYOUT = "bvc:cardLayout";
const K_RESOLUME_LAYOUT = "bvc:resolumeLayout";
const K_TYPO = "bvc:typography";
const K_RESOLUME_TYPO = "bvc:resolumeTypography";
const K_SCHEMA_EN = "bvc:schemaEn";
const K_SCHEMA_HI = "bvc:schemaHi";
const K_VERSE_BLOCK_ORDER = "bvc:verseBlockOrder";
const K_USE_BIBLE_COM_HI = "bvc:useBibleComHi";
const K_HINDI_SOURCE = "bvc:hindiSourceId";
const K_ENGLISH_SQLITE_VERSION = "bvc:englishSqliteVersionId";
const K_BG_DATA_URL = "bvc:bgDataUrl";

export type PersistedState = {
  pages: VersePage[];
  cardLayout: LayoutSpec;
  resolumeLayout: LayoutSpec;
  typography: TypographySpec;
  resolumeTypography: TypographySpec;
  schemaEn: SqliteSchemaConfig;
  schemaHi: SqliteSchemaConfig;
  verseBlockOrder: VerseBlockOrder;
  hindiSourceId: HindiSourceId;
  englishSqliteVersionId: EnglishSqliteVersionId;
};

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

/** Normalize raw JSON (localStorage or KV) into app state fields. */
export function normalizePersisted(raw: {
  pages?: unknown;
  cardLayout?: unknown;
  resolumeLayout?: unknown;
  typography?: unknown;
  resolumeTypography?: unknown;
  schemaEn?: unknown;
  schemaHi?: unknown;
  verseBlockOrder?: unknown;
  useBibleComHi?: unknown;
  hindiSourceId?: unknown;
  englishSqliteVersionId?: unknown;
}): Partial<PersistedState> {
  const pagesRaw = raw.pages as VersePage[] | null | undefined;
  const englishSqliteVersionId =
    raw.englishSqliteVersionId != null
      ? normalizeEnglishSqliteVersionId(String(raw.englishSqliteVersionId))
      : undefined;
  const legacyEnLabel = englishSqliteVersion(
    englishSqliteVersionId ?? normalizeEnglishSqliteVersionId(undefined),
  ).label;
  const hindiSourceId =
    raw.hindiSourceId != null
      ? normalizeHindiSourceId(String(raw.hindiSourceId))
      : raw.useBibleComHi === true
        ? "biblecom"
        : undefined;
  const legacyHiLabel = hindiSourceLabel(
    hindiSourceId ?? normalizeHindiSourceId(undefined),
  );
  const pages = pagesRaw
    ?.map((p): VersePage | null => {
      const ref = normalizeVerseRef(p.ref);
      if (!ref) return null;
      return {
        ...p,
        ref,
        versionLabelEn: p.versionLabelEn ?? legacyEnLabel,
        versionLabelHi: p.versionLabelHi ?? legacyHiLabel,
      };
    })
    .filter((p): p is VersePage => p !== null);

  const cardLayoutRaw = raw.cardLayout;
  const cardLayout = isValidLayout(cardLayoutRaw)
    ? cloneLayout(cardLayoutRaw)
    : undefined;
  const resolumeLayoutRaw = raw.resolumeLayout;
  const resolumeLayout = isValidLayout(resolumeLayoutRaw)
    ? cloneLayout(resolumeLayoutRaw)
    : undefined;
  const typography = raw.typography as TypographySpec | null | undefined;
  const resolumeTypography = raw.resolumeTypography as TypographySpec | null | undefined;
  const schemaEn = raw.schemaEn as SqliteSchemaConfig | null | undefined;
  const schemaHi = raw.schemaHi as SqliteSchemaConfig | null | undefined;
  const verseBlockOrder =
    raw.verseBlockOrder != null
      ? normalizeVerseBlockOrder(raw.verseBlockOrder)
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
    hindiSourceId,
    englishSqliteVersionId,
  };
}

/** Custom card background (data URL from file upload). Stays in localStorage only. */
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

export function loadPersisted(): Partial<PersistedState> {
  try {
    localStorage.removeItem("bvc:layout");
    const pagesRaw = JSON.parse(
      localStorage.getItem(K_PAGES) ?? "null",
    ) as VersePage[] | null;
    const englishSqliteVersionRaw = localStorage.getItem(K_ENGLISH_SQLITE_VERSION);
    const cardLayoutRaw = JSON.parse(
      localStorage.getItem(K_CARD_LAYOUT) ?? "null",
    );
    const resolumeLayoutRaw = JSON.parse(
      localStorage.getItem(K_RESOLUME_LAYOUT) ?? "null",
    );
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
    const useBibleComHiRaw = localStorage.getItem(K_USE_BIBLE_COM_HI);
    const hindiSourceRaw = localStorage.getItem(K_HINDI_SOURCE);

    return normalizePersisted({
      pages: pagesRaw,
      englishSqliteVersionId: englishSqliteVersionRaw,
      cardLayout: cardLayoutRaw,
      resolumeLayout: resolumeLayoutRaw,
      typography,
      resolumeTypography,
      schemaEn,
      schemaHi,
      verseBlockOrder:
        verseBlockOrderRaw != null
          ? JSON.parse(verseBlockOrderRaw)
          : undefined,
      useBibleComHi:
        useBibleComHiRaw != null ? JSON.parse(useBibleComHiRaw) : undefined,
      hindiSourceId: hindiSourceRaw,
    });
  } catch {
    return {};
  }
}

export function savePersistedLocal(state: PersistedState): void {
  localStorage.setItem(K_PAGES, JSON.stringify(state.pages));
  localStorage.setItem(K_CARD_LAYOUT, JSON.stringify(state.cardLayout));
  localStorage.setItem(K_RESOLUME_LAYOUT, JSON.stringify(state.resolumeLayout));
  localStorage.setItem(K_TYPO, JSON.stringify(state.typography));
  localStorage.setItem(K_RESOLUME_TYPO, JSON.stringify(state.resolumeTypography));
  localStorage.setItem(K_SCHEMA_EN, JSON.stringify(state.schemaEn));
  localStorage.setItem(K_SCHEMA_HI, JSON.stringify(state.schemaHi));
  localStorage.setItem(K_VERSE_BLOCK_ORDER, JSON.stringify(state.verseBlockOrder));
  localStorage.setItem(
    K_USE_BIBLE_COM_HI,
    JSON.stringify(state.hindiSourceId === "biblecom"),
  );
  localStorage.setItem(K_HINDI_SOURCE, state.hindiSourceId);
  localStorage.setItem(
    K_ENGLISH_SQLITE_VERSION,
    state.englishSqliteVersionId,
  );
}

/** @deprecated Use {@link savePersistedLocal} or {@link savePersisted}. */
export function savePersisted(state: PersistedState): void {
  savePersistedLocal(state);
}

export { remoteStorageEnabled };

export async function loadPersistedRemote(): Promise<{
  state: Partial<PersistedState>;
  updatedAt: number | null;
}> {
  const payload = await fetchSharedState();
  if (!payload) return { state: {}, updatedAt: null };
  const { updatedAt, ...rest } = payload;
  return {
    state: normalizePersisted(rest),
    updatedAt: typeof updatedAt === "number" ? updatedAt : null,
  };
}

export async function savePersistedRemote(
  state: PersistedState,
  updatedAt?: number,
): Promise<number> {
  return saveSharedState(state, updatedAt);
}

export type { SharedStatePayload };

export { DEFAULT_VERSE_BLOCK_ORDER };
