import {
  CARD_LAYOUT,
  clampLayoutTextToLeftHalf,
  cloneLayout,
  cloneResolumeLayout,
  defaultResolumeTypography,
  defaultTypography,
  normalizeTypography,
} from "../bible/types";
import {
  fetchSharedState,
  remoteStorageEnabled,
  saveSharedState,
} from "./remoteStorage";
import {
  DEFAULT_VERSE_BLOCK_ORDER,
  loadPersisted,
  normalizePersisted,
  type PersistedState,
} from "./storage";
import {
  normalizeEnglishSqliteVersionId,
} from "../config/englishSqliteVersions";
import { normalizeHindiSourceId } from "../config/hindiSources";
import { defaultBackgroundSlots } from "./backgroundSlots";

export const LIVE_PREVIEW_PATH = "/live";
export const LIVE_OUTPUT_PATH = "/live/output";

const K_LIVE_OUTPUT_PAGE_ID = "bvc:liveOutputPageId";
const CHANNEL = "bvc-live-present";

export type LivePresentMessage =
  | { type: "present"; pageId: string | null }
  | { type: "refresh" };

function broadcast(msg: LivePresentMessage): void {
  try {
    const ch = new BroadcastChannel(CHANNEL);
    ch.postMessage(msg);
    ch.close();
  } catch {
    /* BroadcastChannel unsupported */
  }
}

export function loadLiveOutputPageId(): string | null {
  try {
    const raw = localStorage.getItem(K_LIVE_OUTPUT_PAGE_ID);
    if (!raw?.trim()) return null;
    return raw;
  } catch {
    return null;
  }
}

export function saveLiveOutputPageIdLocal(pageId: string | null): void {
  try {
    if (!pageId) localStorage.removeItem(K_LIVE_OUTPUT_PAGE_ID);
    else localStorage.setItem(K_LIVE_OUTPUT_PAGE_ID, pageId);
  } catch {
    /* ignore quota */
  }
  broadcast({ type: "present", pageId });
}

function buildPersistedForRemote(
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

/** Persist the live output page id locally and to shared workspace when enabled. */
export async function setLiveOutputPageId(pageId: string | null): Promise<void> {
  saveLiveOutputPageIdLocal(pageId);

  if (!remoteStorageEnabled()) return;

  try {
    const shared = await fetchSharedState();
    const base = shared ? normalizePersisted(shared) : loadPersisted();
    const state = buildPersistedForRemote(base, pageId);
    await saveSharedState(state, shared?.updatedAt);
  } catch (e) {
    console.warn("Could not sync live output page to shared workspace", e);
  }
}

export function notifyLivePresentRefresh(): void {
  broadcast({ type: "refresh" });
}

export function subscribeLivePresent(
  onMessage: (msg: LivePresentMessage) => void,
): () => void {
  let ch: BroadcastChannel | null = null;
  try {
    ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = (ev: MessageEvent<LivePresentMessage>) => {
      if (ev.data && typeof ev.data === "object" && "type" in ev.data) {
        onMessage(ev.data);
      }
    };
  } catch {
    ch = null;
  }

  const onStorage = (ev: StorageEvent) => {
    if (ev.key === K_LIVE_OUTPUT_PAGE_ID) {
      onMessage({
        type: "present",
        pageId: ev.newValue?.trim() ? ev.newValue : null,
      });
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener("storage", onStorage);
    ch?.close();
  };
}

export function openLiveOutputWindow(): Window | null {
  const url = `${window.location.origin}${LIVE_OUTPUT_PATH}`;
  return window.open(url, "bvc-live-output", "noopener,noreferrer");
}
