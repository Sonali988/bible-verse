import { useEffect, useMemo, useState } from "react";
import { LiveCardStage } from "../components/LiveCardStage";
import { LivePreviewQuickSearch } from "../components/LivePreviewQuickSearch";
import { findPage, useLiveWorkspace } from "../hooks/useLiveWorkspace";
import {
  LIVE_OUTPUT_PATH,
  LIVE_PREVIEW_PATH,
  openLiveOutputWindow,
  setLiveOutputPageId,
} from "../lib/livePresent";
import { navigate } from "../lib/pathRouter";
import { formatReference } from "../lib/referenceParser";

export default function LivePreviewPage() {
  const { snapshot, backgroundUrl, error, reload } = useLiveWorkspace({
    pollMs: 2500,
  });
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.body.classList.add("live-preview-page");
    document.documentElement.classList.add("live-preview-page");
    return () => {
      document.body.classList.remove("live-preview-page");
      document.documentElement.classList.remove("live-preview-page");
    };
  }, []);

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

  const onOpenOutput = () => {
    openLiveOutputWindow();
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
          <span className="chip">Preview before extending</span>
        </div>
        <div className="live-preview__header-actions">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => void reload()}
          >
            Refresh
          </button>
          <button
            type="button"
            className="btn btn--sm"
            onClick={onOpenOutput}
          >
            Open output window
          </button>
        </div>
      </header>

      <p className="live-preview__lead">
        Check the verse on this page first. When it looks right, press{" "}
        <strong>Present</strong>, then put the output window on your extended
        monitor and fullscreen it (F11 or the button on the output page).
      </p>

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
                Output is clear — present a preview when ready (
                <a href={LIVE_OUTPUT_PATH} target="bvc-live-output" rel="noreferrer">
                  {LIVE_OUTPUT_PATH}
                </a>
                )
              </span>
            )}
          </div>
        </section>
      </div>

      <p className="live-preview__footnote muted">
        This page is for checking only ({LIVE_PREVIEW_PATH}). The extended
        monitor should use the output page, not this preview.
      </p>
    </div>
  );
}
