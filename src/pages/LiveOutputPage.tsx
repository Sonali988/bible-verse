import { useCallback, useEffect, useState } from "react";
import { LiveStageOutput } from "../components/LiveStageOutput";
import { findPage, useLiveWorkspace } from "../hooks/useLiveWorkspace";
import { LIVE_PREVIEW_PATH } from "../lib/livePresent";
import { navigate } from "../lib/pathRouter";
import { formatReference } from "../lib/referenceParser";

export default function LiveOutputPage() {
  const { snapshot, backgroundUrl, error, reload } = useLiveWorkspace({
    pollMs: 1500,
  });
  const [chromeVisible, setChromeVisible] = useState(true);

  useEffect(() => {
    document.title = "Live Output";
    document.body.classList.add("live-output-page");
    document.documentElement.classList.add("live-output-page");
    const root = document.getElementById("root");
    root?.classList.add("live-output-root");
    return () => {
      document.title = "Bible verse cards";
      document.body.classList.remove("live-output-page");
      document.documentElement.classList.remove("live-output-page");
      root?.classList.remove("live-output-root");
    };
  }, []);

  const livePage = snapshot
    ? findPage(snapshot.pages, snapshot.liveOutputPageId)
    : null;

  const goFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen({
          navigationUI: "hide",
        });
        setChromeVisible(false);
      }
    } catch {
      /* user gesture / permission */
    }
  }, []);

  useEffect(() => {
    let hideTimer = window.setTimeout(() => setChromeVisible(false), 2500);
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
    const bumpChrome = () => {
      setChromeVisible(true);
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setChromeVisible(false), 2500);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousemove", bumpChrome);
    return () => {
      window.clearTimeout(hideTimer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousemove", bumpChrome);
    };
  }, [goFullscreen]);

  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) setChromeVisible(true);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const statusText = error
    ? error
    : !snapshot
      ? "Loading…"
      : !snapshot.liveOutputPageId
        ? "Black — waiting for Present"
        : !livePage
          ? "Presented card missing from queue"
          : formatReference(livePage.ref);

  return (
    <div className="live-output" onDoubleClick={() => void goFullscreen()}>
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

      {snapshot ? (
        <LiveStageOutput
          page={livePage}
          layout={snapshot.cardLayout}
          typography={snapshot.typography}
          backgroundDataUrl={backgroundUrl}
          versionLabelEn={snapshot.englishLabel}
          versionLabelHi={snapshot.hindiLabel}
          verseBlockOrder={snapshot.verseBlockOrder}
        />
      ) : (
        <div className="live-stage-output" />
      )}
    </div>
  );
}
