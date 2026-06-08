import { useCallback, useEffect, useState } from "react";
import App from "./App";
import {
  loadBackgroundDataUrl,
  loadPersisted,
  loadPersistedRemote,
  remoteStorageEnabled,
  type PersistedState,
} from "./lib/storage";

export type AppBootstrapData = {
  persisted: Partial<PersistedState>;
  bgDataUrl: string | null;
  remoteUpdatedAt: number | null;
};

function loadLocalBootstrap(): AppBootstrapData {
  return {
    persisted: loadPersisted(),
    bgDataUrl: loadBackgroundDataUrl(),
    remoteUpdatedAt: null,
  };
}

export default function AppBootstrap() {
  const remote = remoteStorageEnabled();
  const [boot, setBoot] = useState<AppBootstrapData | null>(
    remote ? null : loadLocalBootstrap(),
  );
  const [remountKey, setRemountKey] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reloadRemote = useCallback(async () => {
    if (!remote) return;
    try {
      const { state, updatedAt } = await loadPersistedRemote();
      setBoot({
        persisted: state,
        bgDataUrl: loadBackgroundDataUrl(),
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
    if (!remote) return;
    void reloadRemote();
  }, [remote, reloadRemote]);

  if (!boot) {
    return (
      <div className="app-bootstrap">
        <p>{loadError ?? "Loading shared cards…"}</p>
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
