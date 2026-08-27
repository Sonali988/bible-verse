import type { BibleProvider } from "../bible/provider";
import type { VerseDraftItem, VersePage } from "../bible/types";
import {
  CARD_LAYOUT,
  clampLayoutTextToLeftHalf,
  cloneLayout,
  cloneResolumeLayout,
  defaultResolumeTypography,
  defaultTypography,
  normalizeTypography,
} from "../bible/types";
import { normalizeEnglishSqliteVersionId } from "../config/englishSqliteVersions";
import { normalizeHindiSourceId } from "../config/hindiSources";
import { defaultBackgroundSlots } from "./backgroundSlots";
import { computeAutoFitBodyFontOverrides } from "./fitVerseBodyFont";
import { newId } from "./id";
import { notifyLivePresentRefresh } from "./livePresent";
import { fetchSharedState } from "./remoteStorage";
import {
  DEFAULT_VERSE_BLOCK_ORDER,
  loadPersisted,
  normalizePersisted,
  remoteStorageEnabled,
  savePersistedLocal,
  savePersistedRemote,
  type PersistedState,
} from "./storage";

function toPersistedState(
  partial: Partial<PersistedState>,
  liveOutputPageId: string | null,
): PersistedState {
  return {
    pages: partial.pages ?? [],
    cardLayout: clampLayoutTextToLeftHalf(
      partial.cardLayout ?? cloneLayout(CARD_LAYOUT),
    ),
    resolumeLayout: partial.resolumeLayout ?? cloneResolumeLayout(),
    typography: normalizeTypography(partial.typography ?? defaultTypography()),
    resolumeTypography: normalizeTypography(
      partial.resolumeTypography ?? defaultResolumeTypography(),
    ),
    verseBlockOrder: partial.verseBlockOrder ?? DEFAULT_VERSE_BLOCK_ORDER,
    hindiSourceId: normalizeHindiSourceId(partial.hindiSourceId),
    englishSqliteVersionId: normalizeEnglishSqliteVersionId(
      partial.englishSqliteVersionId,
    ),
    backgrounds: partial.backgrounds ?? defaultBackgroundSlots(),
    liveOutputPageId,
  };
}

async function loadFullState(): Promise<{
  state: PersistedState;
  remoteUpdatedAt: number | null;
}> {
  if (remoteStorageEnabled()) {
    try {
      const shared = await fetchSharedState();
      const partial = shared ? normalizePersisted(shared) : loadPersisted();
      return {
        state: toPersistedState(partial, partial.liveOutputPageId ?? null),
        remoteUpdatedAt:
          typeof shared?.updatedAt === "number" ? shared.updatedAt : null,
      };
    } catch (e) {
      console.warn("liveAddVerse: remote load failed, using local", e);
    }
  }

  const local = loadPersisted();
  return {
    state: toPersistedState(local, local.liveOutputPageId ?? null),
    remoteUpdatedAt: null,
  };
}

/** Prepend a verse to the Live queue for preview (does not change output). */
export async function addVerseToLivePreview(
  item: VerseDraftItem,
  providerEn: BibleProvider,
  providerHi: BibleProvider,
): Promise<string> {
  await document.fonts.ready;
  const { state, remoteUpdatedAt } = await loadFullState();

  const page: VersePage = {
    id: newId(),
    ref: item.ref,
    textEn: item.textEn,
    textHi: item.textHi,
    versionLabelEn: providerEn.versionLabel,
    versionLabelHi: providerHi.versionLabel,
    highlightsEn: [],
    highlightsHi: [],
    typographySizes: computeAutoFitBodyFontOverrides(
      item,
      state.cardLayout,
      state.typography,
      state.verseBlockOrder,
    ),
    resolumeTypographySizes: computeAutoFitBodyFontOverrides(
      item,
      state.resolumeLayout,
      state.resolumeTypography,
      state.verseBlockOrder,
      "resolume",
    ),
  };

  const next: PersistedState = {
    ...state,
    pages: [page, ...state.pages],
  };

  if (remoteStorageEnabled()) {
    await savePersistedRemote(next, remoteUpdatedAt ?? undefined);
  } else {
    savePersistedLocal(next);
  }
  notifyLivePresentRefresh();
  return page.id;
}
