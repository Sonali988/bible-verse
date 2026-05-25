import { useEffect, useMemo, useState } from "react";
import type { VersePage } from "../bible/types";
import { formatReference } from "../lib/referenceParser";

export type ExportVariant = "live" | "resolume";

type Props = {
  open: boolean;
  pages: VersePage[];
  selectedId: string | null;
  exportBusy: boolean;
  onClose: () => void;
  onDownloadPng: (variant: ExportVariant, pageIds: string[]) => void | Promise<void>;
  onDownloadZip: (variant: ExportVariant, pageIds: string[]) => void | Promise<void>;
};

export function ExportModal({
  open,
  pages,
  selectedId,
  exportBusy,
  onClose,
  onDownloadPng,
  onDownloadZip,
}: Props) {
  const [pageIds, setPageIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!open) return;
    if (selectedId && pages.some((p) => p.id === selectedId)) {
      setPageIds(new Set([selectedId]));
    } else if (pages.length > 0) {
      setPageIds(new Set([pages[0]!.id]));
    } else {
      setPageIds(new Set());
    }
  }, [open, selectedId, pages]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !exportBusy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, exportBusy, onClose]);

  const selectedCount = useMemo(
    () => pages.filter((p) => pageIds.has(p.id)).length,
    [pages, pageIds],
  );

  const togglePage = (id: string, checked: boolean) => {
    setPageIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  if (!open) return null;

  const ids = [...pageIds];
  const canExport = selectedCount > 0 && !exportBusy;

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal panel export-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <h2 id="export-modal-title">Export cards</h2>
          <button
            type="button"
            className="btn btn--ghost btn--sm modal__close"
            aria-label="Close"
            disabled={exportBusy}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {pages.length === 0 ? (
          <p className="muted">Add verses to the queue before exporting.</p>
        ) : (
          <>
            <div className="export-modal__pages">
              <div className="export-modal__pages-head">
                <span className="export-modal__pages-label">Pages</span>
                <span className="export-modal__pages-tools">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={exportBusy}
                    onClick={() => setPageIds(new Set(pages.map((p) => p.id)))}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={exportBusy || !selectedId}
                    onClick={() =>
                      setPageIds(selectedId ? new Set([selectedId]) : new Set())
                    }
                  >
                    Current only
                  </button>
                </span>
              </div>
              <ul className="export-modal__page-list">
                {pages.map((p) => (
                  <li key={p.id}>
                    <label className="export-modal__page-item">
                      <input
                        type="checkbox"
                        checked={pageIds.has(p.id)}
                        disabled={exportBusy}
                        onChange={(e) => togglePage(p.id, e.target.checked)}
                      />
                      <span>{formatReference(p.ref)}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="hint export-modal__hint">
                PNG downloads one file per selected page. ZIP bundles all selected
                pages for the chosen layout.
              </p>
            </div>

            <div className="export-modal__actions">
              <p className="export-modal__section-label">PNG</p>
              <div className="export-modal__btn-row">
                <button
                  type="button"
                  className="btn"
                  disabled={!canExport}
                  onClick={() => void onDownloadPng("live", ids)}
                >
                  Live PNG
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={!canExport}
                  onClick={() => void onDownloadPng("resolume", ids)}
                >
                  Resolume PNG
                </button>
              </div>

              <p className="export-modal__section-label">ZIP</p>
              <div className="export-modal__btn-row">
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={!canExport}
                  onClick={() => void onDownloadZip("live", ids)}
                >
                  Live ZIP
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={!canExport}
                  onClick={() => void onDownloadZip("resolume", ids)}
                >
                  Resolume ZIP
                </button>
              </div>
            </div>
          </>
        )}

        {exportBusy && <p className="muted export-modal__busy">Rendering…</p>}
      </div>
    </div>
  );
}
