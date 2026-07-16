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
  fetchSharedBackgrounds,
  fetchSharedState,
  remoteStorageEnabled,
  saveSharedBackgroundSlots,
  saveSharedState,
  type SharedStatePayload,
} from "./remoteStorage";
import {
  defaultBackgroundSlots,
  normalizeBackgroundSlots,
  type BackgroundSlots,
} from "./backgroundSlots";
import {
  loadBackgroundImagesFromIdb,
  saveBackgroundImagesToIdb,
} from "./backgroundImageStore";

const K_PAGES = "bvc:pages";
const K_CARD_LAYOUT = "bvc:cardLayout";
const K_RESOLUME_LAYOUT = "bvc:resolumeLayout";
const K_TYPO = "bvc:typography";
const K_RESOLUME_TYPO = "bvc:resolumeTypography";
const K_VERSE_BLOCK_ORDER = "bvc:verseBlockOrder";
const K_HINDI_SOURCE = "bvc:hindiSourceId";
const K_ENGLISH_SQLITE_VERSION = "bvc:englishSqliteVersionId";
const K_BG_DATA_URL = "bvc:bgDataUrl";
const K_BACKGROUNDS = "bvc:backgrounds";

export type { BackgroundSlots };
export {
  defaultBackgroundSlots,
  normalizeBackgroundSlots,
  selectedBackgroundUrl,
  BACKGROUND_SLOT_COUNT,
} from "./backgroundSlots";

export type PersistedState = {
  pages: VersePage[];
  cardLayout: LayoutSpec;
  resolumeLayout: LayoutSpec;
  typography: TypographySpec;
  resolumeTypography: TypographySpec;
  verseBlockOrder: VerseBlockOrder;
  hindiSourceId: HindiSourceId;
  englishSqliteVersionId: EnglishSqliteVersionId;
  backgrounds: BackgroundSlots;
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
  verseBlockOrder?: unknown;
  hindiSourceId?: unknown;
  englishSqliteVersionId?: unknown;
  backgrounds?: unknown;
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
  const verseBlockOrder =
    raw.verseBlockOrder != null
      ? normalizeVerseBlockOrder(raw.verseBlockOrder)
      : undefined;
  const backgrounds = normalizeBackgroundSlots(raw.backgrounds);
  return {
    pages: pages ?? undefined,
    cardLayout,
    resolumeLayout,
    typography: typography ?? undefined,
    resolumeTypography: resolumeTypography ?? undefined,
    verseBlockOrder,
    hindiSourceId,
    englishSqliteVersionId,
    backgrounds,
  };
}

export function loadBackgroundSlotsMeta(): Pick<BackgroundSlots, "selectedIndex"> {
  try {
    const raw = JSON.parse(localStorage.getItem(K_BACKGROUNDS) ?? "null") as
      | { selectedIndex?: unknown; images?: unknown }
      | null;
    if (!raw || typeof raw !== "object") return { selectedIndex: 0 };
    if (typeof raw.selectedIndex === "number" && Number.isFinite(raw.selectedIndex)) {
      return {
        selectedIndex: Math.min(
          3,
          Math.max(0, Math.floor(raw.selectedIndex)),
        ),
      };
    }
    return { selectedIndex: 0 };
  } catch {
    return { selectedIndex: 0 };
  }
}

/** Legacy inline images in localStorage (pre-IndexedDB). */
export function loadLegacyInlineBackgrounds(): BackgroundSlots | null {
  try {
    const raw = JSON.parse(localStorage.getItem(K_BACKGROUNDS) ?? "null");
    if (!raw || typeof raw !== "object" || !Array.isArray((raw as { images?: unknown }).images)) {
      return null;
    }
    return normalizeBackgroundSlots(raw, loadBackgroundDataUrl());
  } catch {
    return null;
  }
}

export async function loadLocalBackgroundSlots(): Promise<BackgroundSlots> {
  const legacy = loadLegacyInlineBackgrounds();
  if (legacy?.images.some((img) => img)) {
    await saveBackgroundImagesToIdb(legacy.images);
    saveBackgroundSlotsMeta(legacy.selectedIndex);
    return legacy;
  }
  const meta = loadBackgroundSlotsMeta();
  const images = await loadBackgroundImagesFromIdb();
  return normalizeBackgroundSlots({ images, selectedIndex: meta.selectedIndex });
}

export function saveBackgroundSlotsMeta(selectedIndex: number): boolean {
  try {
    localStorage.setItem(
      K_BACKGROUNDS,
      JSON.stringify({ selectedIndex }),
    );
    return true;
  } catch (e) {
    console.warn("Could not save background slot selection", e);
    return false;
  }
}

export async function saveLocalBackgroundSlots(
  slots: BackgroundSlots,
): Promise<boolean> {
  const metaOk = saveBackgroundSlotsMeta(slots.selectedIndex);
  const imagesOk = await saveBackgroundImagesToIdb(slots.images);
  return metaOk && imagesOk;
}

/** @deprecated Legacy single background — migrated into `backgrounds` on load. */
export function loadBackgroundDataUrl(): string | null {
  try {
    const raw = localStorage.getItem(K_BG_DATA_URL);
    return raw && raw.trim().length > 0 ? raw : null;
  } catch {
    return null;
  }
}

/** @deprecated Backgrounds are stored in `PersistedState.backgrounds`. */
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
    const verseBlockOrderRaw = localStorage.getItem(K_VERSE_BLOCK_ORDER);
    const hindiSourceRaw = localStorage.getItem(K_HINDI_SOURCE);
    const meta = loadBackgroundSlotsMeta();

    return normalizePersisted({
      pages: pagesRaw,
      englishSqliteVersionId: englishSqliteVersionRaw,
      cardLayout: cardLayoutRaw,
      resolumeLayout: resolumeLayoutRaw,
      typography,
      resolumeTypography,
      verseBlockOrder:
        verseBlockOrderRaw != null
          ? JSON.parse(verseBlockOrderRaw)
          : undefined,
      hindiSourceId: hindiSourceRaw,
      backgrounds: normalizeBackgroundSlots({ selectedIndex: meta.selectedIndex }),
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
  localStorage.setItem(K_VERSE_BLOCK_ORDER, JSON.stringify(state.verseBlockOrder));
  localStorage.setItem(K_HINDI_SOURCE, state.hindiSourceId);
  localStorage.setItem(
    K_ENGLISH_SQLITE_VERSION,
    state.englishSqliteVersionId,
  );
  saveBackgroundSlotsMeta(state.backgrounds.selectedIndex);
}

export { remoteStorageEnabled };

export async function loadPersistedRemote(): Promise<{
  state: Partial<PersistedState>;
  updatedAt: number | null;
}> {
  const payload = await fetchSharedState();
  if (!payload) return { state: {}, updatedAt: null };
  const { updatedAt, ...rest } = payload;
  const normalized = normalizePersisted(rest);
  const images = await fetchSharedBackgrounds();
  const selectedIndex = normalized.backgrounds?.selectedIndex ?? 0;
  return {
    state: {
      ...normalized,
      backgrounds: normalizeBackgroundSlots({ images, selectedIndex }),
    },
    updatedAt: typeof updatedAt === "number" ? updatedAt : null,
  };
}

export async function savePersistedRemote(
  state: PersistedState,
  updatedAt?: number,
): Promise<number> {
  return saveSharedState(state, updatedAt);
}

export async function savePersistedRemoteBackgrounds(
  slots: BackgroundSlots,
): Promise<void> {
  await saveSharedBackgroundSlots(slots);
}

export type { SharedStatePayload };

export { DEFAULT_VERSE_BLOCK_ORDER };
