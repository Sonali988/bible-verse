import { useCallback, useEffect, useMemo, useState } from "react";
import { LiveCardStage } from "../components/LiveCardStage";
import { LivePreviewQuickSearch } from "../components/LivePreviewQuickSearch";
import { findPage, useLiveWorkspace } from "../hooks/useLiveWorkspace";
import { useCaptureWakeLock } from "../hooks/useCaptureWakeLock";
import {
  LIVE_OUTPUT_PATH,
  setLiveOutputPageId,
} from "../lib/livePresent";
import { navigate } from "../lib/pathRouter";
import { formatReference } from "../lib/referenceParser";
import {
  closeLiveOutputWindow,
  listOutputScreens,
  loadPreferredOutputLabel,
  pickDefaultOutputScreen,
  savePreferredOutputLabel,
  startAtemOutput,
  windowManagementSupported,
  type OutputScreenChoice,
} from "../lib/outputDisplay";

export default function LivePreviewPage() {
  const { snapshot, backgroundUrl, error, reload } = useLiveWorkspace({
    pollMs: 2500,
  });
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [screens, setScreens] = useState<OutputScreenChoice[] | null>(null);
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null);
  const [outputMode, setOutputMode] = useState<"off" | "window">("off");
  const [outputHint, setOutputHint] = useState<string | null>(null);
  useCaptureWakeLock(outputMode !== "off");

  useEffect(() => {
    document.body.classList.add("live-preview-page");
    document.documentElement.classList.add("live-preview-page");
    return () => {
      document.body.classList.remove("live-preview-page");
      document.documentElement.classList.remove("live-preview-page");
    };
  }, []);

  const refreshScreens = useCallback(async () => {
    const list = await listOutputScreens();
    setScreens(list);
    if (!list?.length) return;
    const preferred = loadPreferredOutputLabel();
    const pick = pickDefaultOutputScreen(list, preferred);
    if (pick) {
      setSelectedScreenId(pick.id);
      savePreferredOutputLabel(pick.label);
    }
  }, []);

  useEffect(() => {
    if (!windowManagementSupported()) return;
    void refreshScreens();
  }, [refreshScreens]);

  useEffect(() => {
    if (!snapshot) return;
    setPreviewId((prev) => {
      if (prev && snapshot.pages.some((p) => p.id === prev)) return prev;
      if (
        snapshot.liveOutputPageId &&
        snapshot.pages.some((p) => p.id === snapshot.liveOutputPageId)
      ) {
        return snapshot.liveOutputPageId;
      }
      return snapshot.pages[0]?.id ?? null;
    });
  }, [snapshot]);

  const previewPage = snapshot ? findPage(snapshot.pages, previewId) : null;
  const livePage = snapshot
    ? findPage(snapshot.pages, snapshot.liveOutputPageId)
    : null;

  const [viewportW, setViewportW] = useState(
    () => (typeof window !== "undefined" ? window.innerWidth : 1200),
  );

  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const previewScale = useMemo(() => {
    if (!snapshot) return 0.45;
    const maxW = Math.min(960, viewportW - 48);
    return Math.min(0.55, maxW / snapshot.cardLayout.width);
  }, [snapshot, viewportW]);

  const onPresent = async () => {
    if (!previewId) return;
    setBusy(true);
    try {
      await setLiveOutputPageId(previewId);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const onClear = async () => {
    setBusy(true);
    try {
      await setLiveOutputPageId(null);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const onStartOutput = async () => {
    setOutputHint(null);
    const result = await startAtemOutput(selectedScreenId);
    if (result.screens.length) {
      setScreens(result.screens);
      if (result.screen) setSelectedScreenId(result.screen.id);
    }
    if (!result.ok) {
      setOutputHint(result.error ?? "Could not open the ATEM output window.");
      return;
    }
    setOutputMode("window");
    setOutputHint(
      result.error ??
        `Output is on ${result.screen?.label ?? "the extended display"}. ATEM should now see that HDMI. Present a verse here.`,
    );
  };

  const onStopOutput = () => {
    closeLiveOutputWindow();
    setOutputMode("off");
  };

  const onOpenOutputWindow = () => {
    void onStartOutput();
  };

  if (error && !snapshot) {
    return (
      <div className="live-preview">
        <p className="live-preview__error">{error}</p>
        <button type="button" className="btn" onClick={() => void reload()}>
          Retry
        </button>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="live-preview">
        <p className="muted">Loading Live preview…</p>
      </div>
    );
  }

  const isOnOutput =
    Boolean(previewId) && previewId === snapshot.liveOutputPageId;

  return (
    <div className="live-preview">
      <header className="live-preview__header">
        <div className="live-preview__brand">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => navigate("/")}
          >
            ← Editor
          </button>
          <h1>Live present</h1>
          <span className="chip">Operator / preview</span>
        </div>
        <div className="live-preview__header-actions">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => void reload()}
          >
            Refresh
          </button>
        </div>
      </header>

      <section className="live-preview__output-bar panel">
        <div className="live-preview__output-bar-main">
          <label className="live-preview__display-label">
            Output display
            <select
              className="live-preview__display-select"
              value={selectedScreenId ?? ""}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedScreenId(id);
                const match = screens?.find((s) => s.id === id);
                if (match) savePreferredOutputLabel(match.label);
              }}
              onFocus={() => void refreshScreens()}
            >
              {!screens?.length ? (
                <option value="">
                  {windowManagementSupported()
                    ? "Click Start output to pick a display"
                    : "Extended display (use Chrome/Edge to list screens)"}
                </option>
              ) : (
                screens.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                    {s.isPrimary ? " (this computer)" : ""}
                    {s.isCurrent && !s.isPrimary ? " (this window)" : ""}
                    {` · ${s.width}×${s.height}`}
                  </option>
                ))
              )}
            </select>
          </label>
          {outputMode === "off" ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void onStartOutput()}
            >
              Start ATEM output
            </button>
          ) : (
            <button
              type="button"
              className="btn"
              onClick={onStopOutput}
            >
              Stop output
            </button>
          )}
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={onOpenOutputWindow}
          >
            Open output window
          </button>
        </div>
        <p className="live-preview__output-bar-hint muted">
          This does not send the editor page to ATEM. Click{" "}
          <strong>Start ATEM output</strong> so a second window opens on the
          HDMI display (same as OpenLP / ProPresenter). Allow pop-ups and
          “Window management” in Chrome/Edge. Then Present from this laptop.
        </p>
        {outputHint ? (
          <p className="live-preview__output-bar-status">{outputHint}</p>
        ) : null}
      </section>

      <div className="live-preview__layout">
        <aside className="live-preview__queue panel">
          <div className="live-preview__queue-head">
            <h2>Queue</h2>
            <span className="badge">{snapshot.pages.length}</span>
          </div>
          <LivePreviewQuickSearch
            onAdded={(pageId) => {
              setPreviewId(pageId);
              void reload();
            }}
          />
          {snapshot.pages.length === 0 ? (
            <p className="muted">
              No cards yet. Add verses in the{" "}
              <button
                type="button"
                className="linkish"
                onClick={() => navigate("/")}
              >
                editor
              </button>
              .
            </p>
          ) : (
            <ul className="live-preview__queue-list">
              {snapshot.pages.map((p) => {
                const selected = p.id === previewId;
                const onAir = p.id === snapshot.liveOutputPageId;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      className={
                        selected
                          ? "live-preview__queue-item live-preview__queue-item--selected"
                          : "live-preview__queue-item"
                      }
                      onClick={() => setPreviewId(p.id)}
                    >
                      <span className="live-preview__queue-item-main">
                        <span className="live-preview__queue-item-ref">
                          {formatReference(p.ref)}
                        </span>
                        {p.textEn.trim() ? (
                          <span className="live-preview__queue-item-text">
                            {p.textEn.trim()}
                          </span>
                        ) : null}
                      </span>
                      {onAir ? (
                        <span className="chip chip--accent">On output</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section className="live-preview__stage panel">
          <div className="live-preview__stage-head">
            <div>
              <h2>Preview</h2>
              <p className="hint">
                {previewPage
                  ? formatReference(previewPage.ref)
                  : "Select a card to preview"}
              </p>
            </div>
            <div className="live-preview__stage-actions">
              <button
                type="button"
                className="btn btn--primary"
                disabled={!previewPage || busy || isOnOutput}
                onClick={() => void onPresent()}
              >
                {isOnOutput ? "On output" : "Present"}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                disabled={!snapshot.liveOutputPageId || busy}
                onClick={() => void onClear()}
              >
                Clear output
              </button>
            </div>
          </div>

          <div className="live-preview__canvas-wrap">
            {previewPage ? (
              <LiveCardStage
                page={previewPage}
                layout={snapshot.cardLayout}
                typography={snapshot.typography}
                backgroundDataUrl={backgroundUrl}
                versionLabelEn={snapshot.englishLabel}
                versionLabelHi={snapshot.hindiLabel}
                verseBlockOrder={snapshot.verseBlockOrder}
                scale={previewScale}
                className="live-preview__canvas"
              />
            ) : (
              <div className="live-preview__empty">
                <p>Nothing to preview.</p>
              </div>
            )}
          </div>

          <div className="live-preview__status" aria-live="polite">
            {livePage ? (
              <span>
                Output showing <strong>{formatReference(livePage.ref)}</strong>
                {" · "}
                <a href={LIVE_OUTPUT_PATH} target="bvc-live-output" rel="noreferrer">
                  {LIVE_OUTPUT_PATH}
                </a>
              </span>
            ) : (
              <span className="muted">
                Output is black until you press Present
              </span>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
