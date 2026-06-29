import { useEffect, useRef, useState } from "react";
import {
  saveLocalBackgroundSlots,
  savePersistedLocal,
  savePersistedRemote,
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
      return;
    }

    window.clearTimeout(sharedSaveTimerRef.current);
    setSharedSaveState("saving");
    sharedSaveTimerRef.current = window.setTimeout(() => {
      void savePersistedRemote(snapshot, remoteUpdatedAtRef.current ?? undefined)
        .then((updatedAt) => {
          remoteUpdatedAtRef.current = updatedAt;
          setSharedSaveState("saved");
        })
        .catch(() => {
          setSharedSaveState("error");
        });
    }, 800);

    return () => {
      window.clearTimeout(sharedSaveTimerRef.current);
    };
  }, [snapshot, sharedStorage]);

  return { sharedSaveState, bgSaveWarning, setBgSaveWarning };
}

const MAX_BG_DATA_URL_CHARS = 4_500_000;

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
  const r = new FileReader();
  r.onload = () => {
    const dataUrl = String(r.result);
    if (dataUrl.length > MAX_BG_DATA_URL_CHARS) {
      onWarning(
        "Background image is too large to save. Use a smaller file or replace public/bg.png.",
      );
      return;
    }
    onDataUrl(dataUrl);
  };
  r.onerror = () => {
    console.error("Could not read background image file");
    onDataUrl(null);
  };
  r.readAsDataURL(file);
}
