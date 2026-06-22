import { useEffect, useRef, useState } from "react";
import {
  saveBackgroundDataUrl,
  savePersistedLocal,
  savePersistedRemote,
  type PersistedState,
} from "../lib/storage";

export function useAppPersistence(
  snapshot: PersistedState,
  sharedStorage: boolean,
  remoteUpdatedAt: number | null,
  bgDataUrl: string | null,
) {
  const [sharedSaveState, setSharedSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [bgSaveWarning, setBgSaveWarning] = useState<string | null>(null);
  const sharedSaveTimerRef = useRef<number | undefined>(undefined);
  const remoteUpdatedAtRef = useRef<number | null>(remoteUpdatedAt);
  const skipInitialRemoteSaveRef = useRef(sharedStorage);

  useEffect(() => {
    remoteUpdatedAtRef.current = remoteUpdatedAt;
  }, [remoteUpdatedAt]);

  useEffect(() => {
    if (bgDataUrl && !saveBackgroundDataUrl(bgDataUrl)) {
      setBgSaveWarning(
        "Background image is too large to remember after refresh. Use a smaller file or replace public/bg.png.",
      );
    } else {
      setBgSaveWarning(null);
    }
  }, [bgDataUrl]);

  useEffect(() => {
    if (!sharedStorage) {
      savePersistedLocal(snapshot);
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
    onDataUrl(dataUrl);
    if (!saveBackgroundDataUrl(dataUrl)) {
      onWarning(
        "Background image is too large to remember after refresh. Use a smaller file or replace public/bg.png.",
      );
    }
  };
  r.onerror = () => {
    console.error("Could not read background image file");
    onDataUrl(null);
  };
  r.readAsDataURL(file);
}
