import { useCallback, useEffect, useState } from "react";
import {
  CARD_LAYOUT,
  clampLayoutTextToLeftHalf,
  cloneLayout,
  cloneResolumeLayout,
  defaultResolumeTypography,
  defaultTypography,
  normalizeTypography,
  type LayoutSpec,
  type TypographySpec,
  type VersePage,
} from "../bible/types";
import { normalizeEnglishSqliteVersionId } from "../config/englishSqliteVersions";
import { normalizeHindiSourceId } from "../config/hindiSources";
import {
  defaultBackgroundSlots,
  selectedBackgroundUrl,
  type BackgroundSlots,
} from "../lib/backgroundSlots";
import {
  loadLiveOutputPageId,
  subscribeLivePresent,
} from "../lib/livePresent";
import {
  DEFAULT_VERSE_BLOCK_ORDER,
  loadLocalBackgroundSlots,
  loadPersisted,
  loadPersistedRemote,
  remoteStorageEnabled,
  type PersistedState,
} from "../lib/storage";
import type { VerseBlockOrder } from "../lib/verseBlockOrder";

export type LiveWorkspaceSnapshot = {
  pages: VersePage[];
  cardLayout: LayoutSpec;
  typography: TypographySpec;
  verseBlockOrder: VerseBlockOrder;
  backgrounds: BackgroundSlots;
  liveOutputPageId: string | null;
  englishLabel: string;
  hindiLabel: string;
};

function snapshotFromPartial(
  partial: Partial<PersistedState>,
  backgrounds: BackgroundSlots,
  liveOutputPageId: string | null,
): LiveWorkspaceSnapshot {
  const pages = partial.pages ?? [];
  return {
    pages,
    cardLayout: clampLayoutTextToLeftHalf(
      partial.cardLayout ?? cloneLayout(CARD_LAYOUT),
    ),
    typography: normalizeTypography(partial.typography ?? defaultTypography()),
    verseBlockOrder: partial.verseBlockOrder ?? DEFAULT_VERSE_BLOCK_ORDER,
    backgrounds,
    liveOutputPageId,
    englishLabel:
      pages.find((p) => p.versionLabelEn)?.versionLabelEn ?? "English",
    hindiLabel: pages.find((p) => p.versionLabelHi)?.versionLabelHi ?? "Hindi",
  };
}

async function loadSnapshot(): Promise<LiveWorkspaceSnapshot> {
  if (remoteStorageEnabled()) {
    try {
      const { state } = await loadPersistedRemote();
      const backgrounds = state.backgrounds ?? defaultBackgroundSlots();
      const liveId =
        state.liveOutputPageId !== undefined
          ? state.liveOutputPageId
          : loadLiveOutputPageId();
      if (
        state.liveOutputPageId !== undefined &&
        state.liveOutputPageId !== loadLiveOutputPageId()
      ) {
        try {
          if (!state.liveOutputPageId) {
            localStorage.removeItem("bvc:liveOutputPageId");
          } else {
            localStorage.setItem(
              "bvc:liveOutputPageId",
              state.liveOutputPageId,
            );
          }
        } catch {
          /* ignore */
        }
      }
      return snapshotFromPartial(state, backgrounds, liveId);
    } catch (e) {
      console.warn("Live workspace: remote load failed, using local", e);
    }
  }

  const persisted = loadPersisted();
  const backgrounds = await loadLocalBackgroundSlots();
  return snapshotFromPartial(
    {
      ...persisted,
      hindiSourceId: normalizeHindiSourceId(persisted.hindiSourceId),
      englishSqliteVersionId: normalizeEnglishSqliteVersionId(
        persisted.englishSqliteVersionId,
      ),
      resolumeLayout: persisted.resolumeLayout ?? cloneResolumeLayout(),
      resolumeTypography: normalizeTypography(
        persisted.resolumeTypography ?? defaultResolumeTypography(),
      ),
    },
    backgrounds,
    loadLiveOutputPageId() ?? persisted.liveOutputPageId ?? null,
  );
}

/** Loads queue + Live design for the present preview/output pages; keeps in sync. */
export function useLiveWorkspace(opts?: { pollMs?: number }) {
  const pollMs = opts?.pollMs ?? 2000;
  const [snapshot, setSnapshot] = useState<LiveWorkspaceSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const next = await loadSnapshot();
      setSnapshot(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load live workspace");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    return subscribeLivePresent((msg) => {
      if (msg.type === "present") {
        setSnapshot((prev) =>
          prev ? { ...prev, liveOutputPageId: msg.pageId } : prev,
        );
        void reload();
        return;
      }
      void reload();
    });
  }, [reload]);

  useEffect(() => {
    const onStorage = (ev: StorageEvent) => {
      if (!ev.key || ev.key.startsWith("bvc:")) {
        void reload();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [reload]);

  useEffect(() => {
    const id = window.setInterval(() => void reload(), pollMs);
    return () => window.clearInterval(id);
  }, [pollMs, reload]);

  const backgroundUrl = snapshot
    ? selectedBackgroundUrl(snapshot.backgrounds)
    : null;

  return { snapshot, backgroundUrl, error, reload };
}

export function findPage(
  pages: VersePage[],
  pageId: string | null,
): VersePage | null {
  if (!pageId) return null;
  return pages.find((p) => p.id === pageId) ?? null;
}
