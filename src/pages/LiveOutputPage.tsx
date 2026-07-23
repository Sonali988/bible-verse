import { useCallback, useEffect, useMemo, useState } from "react";
import { LiveCardStage } from "../components/LiveCardStage";
import { findPage, useLiveWorkspace } from "../hooks/useLiveWorkspace";
import { LIVE_PREVIEW_PATH } from "../lib/livePresent";
import { navigate } from "../lib/pathRouter";
import { formatReference } from "../lib/referenceParser";

function useContainScale(width: number, height: number): number {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () => {
      const pad = 0;
      const sw = (window.innerWidth - pad) / width;
      const sh = (window.innerHeight - pad) / height;
      setScale(Math.min(sw, sh, 1) > 0 ? Math.min(sw, sh) : 1);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [width, height]);

  return scale;
}

export default function LiveOutputPage() {
  const { snapshot, backgroundUrl, error, reload } = useLiveWorkspace({
    pollMs: 1500,
  });
  const [chromeVisible, setChromeVisible] = useState(true);

  useEffect(() => {
    document.body.classList.add("live-output-page");
    document.documentElement.classList.add("live-output-page");
    const root = document.getElementById("root");
    root?.classList.add("live-output-root");
    return () => {
      document.body.classList.remove("live-output-page");
      document.documentElement.classList.remove("live-output-page");
      root?.classList.remove("live-output-root");
    };
  }, []);

  const livePage = snapshot
    ? findPage(snapshot.pages, snapshot.liveOutputPageId)
    : null;

  const layoutW = snapshot?.cardLayout.width ?? 1920;
  const layoutH = snapshot?.cardLayout.height ?? 1080;
  const scale = useContainScale(layoutW, layoutH);

  const goFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setChromeVisible(false);
      }
    } catch {
      /* user gesture / permission */
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        void goFullscreen();
      }
      if (e.key === "Escape") {
        setChromeVisible(true);
      }
      if (e.key === "h" || e.key === "H") {
        setChromeVisible((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goFullscreen]);

  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) setChromeVisible(true);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const statusText = useMemo(() => {
    if (error) return error;
    if (!snapshot) return "Loading…";
    if (!snapshot.liveOutputPageId) return "Waiting for Present from Live preview…";
    if (!livePage) return "Presented card not found in queue — clear or present again.";
    return formatReference(livePage.ref);
  }, [error, snapshot, livePage]);

  return (
    <div
      className="live-output"
      onMouseMove={() => setChromeVisible(true)}
      onDoubleClick={() => void goFullscreen()}
    >
      {chromeVisible && (
        <div className="live-output__chrome">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => navigate(LIVE_PREVIEW_PATH)}
          >
            Live preview
          </button>
          <span className="live-output__chrome-status">{statusText}</span>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => void goFullscreen()}
          >
            Fullscreen
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => void reload()}
          >
            Refresh
          </button>
        </div>
      )}

      <div className="live-output__stage">
        {snapshot && livePage ? (
          <LiveCardStage
            page={livePage}
            layout={snapshot.cardLayout}
            typography={snapshot.typography}
            backgroundDataUrl={backgroundUrl}
            versionLabelEn={snapshot.englishLabel}
            versionLabelHi={snapshot.hindiLabel}
            verseBlockOrder={snapshot.verseBlockOrder}
            scale={scale}
          />
        ) : (
          <div className="live-output__idle">
            <p>{statusText}</p>
            <p className="muted">
              Open <strong>{LIVE_PREVIEW_PATH}</strong>, check a verse, then press
              Present.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
