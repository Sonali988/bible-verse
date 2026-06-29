import { useCallback, useEffect, useState } from "react";
import App from "./App";
import {
  loadLocalBackgroundSlots,
  loadPersisted,
  loadPersistedRemote,
  remoteStorageEnabled,
  type PersistedState,
} from "./lib/storage";

export type AppBootstrapData = {
  persisted: Partial<PersistedState>;
  remoteUpdatedAt: number | null;
};

async function loadLocalBootstrap(): Promise<AppBootstrapData> {
  const persisted = loadPersisted();
  const backgrounds = await loadLocalBackgroundSlots();
  return {
    persisted: { ...persisted, backgrounds },
    remoteUpdatedAt: null,
  };
}

export default function AppBootstrap() {
  const remote = remoteStorageEnabled();
  const [boot, setBoot] = useState<AppBootstrapData | null>(null);
  const [remountKey, setRemountKey] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reloadRemote = useCallback(async () => {
    if (!remote) return;
    try {
      const { state, updatedAt } = await loadPersistedRemote();
      setBoot({
        persisted: state,
        remoteUpdatedAt: updatedAt,
      });
      setRemountKey((key) => key + 1);
      setLoadError(null);
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : "Could not load shared cards",
      );
    }
  }, [remote]);

  useEffect(() => {
    let cancelled = false;
    if (remote) {
      void reloadRemote();
      return;
    }
    void loadLocalBootstrap().then((data) => {
      if (!cancelled) setBoot(data);
    });
    return () => {
      cancelled = true;
    };
  }, [remote, reloadRemote]);

  if (!boot) {
    return (
      <div className="app-bootstrap">
        <p>{loadError ?? "Loading…"}</p>
        {loadError ? (
          <button type="button" onClick={() => void reloadRemote()}>
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <App
      key={remountKey}
      bootstrap={boot}
      sharedStorage={remote}
      onReloadShared={remote ? reloadRemote : undefined}
    />
  );
}
