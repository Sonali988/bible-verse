import { useEffect, useRef, useState } from "react";
import { fileToCompressedBackgroundDataUrl } from "../lib/compressBackground";
import {
  saveLocalBackgroundSlots,
  savePersistedLocal,
  savePersistedRemote,
  savePersistedRemoteBackgrounds,
  type PersistedState,
} from "../lib/storage";

export function useAppPersistence(
  snapshot: PersistedState,
  sharedStorage: boolean,
  remoteUpdatedAt: number | null,
) {
  const [sharedSaveState, setSharedSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [bgSaveWarning, setBgSaveWarning] = useState<string | null>(null);
  const sharedSaveTimerRef = useRef<number | undefined>(undefined);
  const remoteUpdatedAtRef = useRef<number | null>(remoteUpdatedAt);
  const skipInitialRemoteSaveRef = useRef(sharedStorage);
  const lastBackgroundsRef = useRef(snapshot.backgrounds);

  useEffect(() => {
    remoteUpdatedAtRef.current = remoteUpdatedAt;
  }, [remoteUpdatedAt]);

  useEffect(() => {
    if (!sharedStorage) {
      savePersistedLocal(snapshot);
      if (lastBackgroundsRef.current !== snapshot.backgrounds) {
        lastBackgroundsRef.current = snapshot.backgrounds;
        void saveLocalBackgroundSlots(snapshot.backgrounds).then((ok) => {
          if (!ok) {
            setBgSaveWarning(
              "Background images could not be saved locally. They will work until you refresh this tab.",
            );
          }
        });
      }
      return;
    }

    if (skipInitialRemoteSaveRef.current) {
      skipInitialRemoteSaveRef.current = false;
      lastBackgroundsRef.current = snapshot.backgrounds;
      return;
    }

    const backgroundsChanged =
      lastBackgroundsRef.current !== snapshot.backgrounds;

    window.clearTimeout(sharedSaveTimerRef.current);
    setSharedSaveState("saving");
    sharedSaveTimerRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          if (backgroundsChanged) {
            lastBackgroundsRef.current = snapshot.backgrounds;
            await savePersistedRemoteBackgrounds(snapshot.backgrounds);
          }
          const updatedAt = await savePersistedRemote(
            snapshot,
            remoteUpdatedAtRef.current ?? undefined,
          );
          remoteUpdatedAtRef.current = updatedAt;
          setSharedSaveState("saved");
          setBgSaveWarning(null);
        } catch (e) {
          setSharedSaveState("error");
          const message =
            e instanceof Error ? e.message : "Failed to save shared state";
          if (/background|413|too large/i.test(message)) {
            setBgSaveWarning(message);
          }
        }
      })();
    }, 800);

    return () => {
      window.clearTimeout(sharedSaveTimerRef.current);
    };
  }, [snapshot, sharedStorage]);

  return { sharedSaveState, bgSaveWarning, setBgSaveWarning };
}

export function readBackgroundFile(
  file: File | null,
  onDataUrl: (url: string | null) => void,
  onWarning: (message: string | null) => void,
): void {
  onWarning(null);
  if (!file) {
    onDataUrl(null);
    return;
  }
  if (!file.type.startsWith("image/")) {
    console.warn("Background file is not a supported image type:", file.type);
    return;
  }
  void fileToCompressedBackgroundDataUrl(file)
    .then((dataUrl) => onDataUrl(dataUrl))
    .catch((e) => {
      const message =
        e instanceof Error
          ? e.message
          : "Could not prepare background image for save.";
      onWarning(message);
    });
}
