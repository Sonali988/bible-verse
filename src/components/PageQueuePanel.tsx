import type { HighlightRange, VersePage } from "../bible/types";
import { formatReference } from "../lib/referenceParser";
import { HighlightEditor } from "./HighlightEditor";

type ExportVariant = "live" | "resolume";

type Props = {
  pages: VersePage[];
  selectedId: string | null;
  selected: VersePage | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  exportPageIds: Set<string>;
  exportBusy: boolean;
  pagesForExportCount: number;
  onToggleExportPage: (pageId: string, checked: boolean) => void;
  onExportSelectAll: () => void;
  onExportSelectSelectedOnly: () => void;
  onDownloadPng: (variant: ExportVariant) => void;
  onDownloadZip: (variant: ExportVariant) => void;
  onUpdateHighlights: (lang: "en" | "hi", ranges: HighlightRange[]) => void;
  labelEn: string;
  labelHi: string;
};

export function PageQueuePanel({
  pages,
  selectedId,
  selected,
  onSelect,
  onRemove,
  exportPageIds,
  exportBusy,
  pagesForExportCount,
  onToggleExportPage,
  onExportSelectAll,
  onExportSelectSelectedOnly,
  onDownloadPng,
  onDownloadZip,
  onUpdateHighlights,
  labelEn,
  labelHi,
}: Props) {
  return (
    <section className="panel page-queue-panel">
      <div className="page-queue-panel__head">
        <div>
          <h2>Page queue</h2>
          <p className="hint page-queue-panel__hint">
            Select a card to edit highlights. Export uses the checkboxes below.
          </p>
        </div>
        {pages.length > 0 && <span className="badge">{pages.length}</span>}
      </div>

      {pages.length === 0 ? (
        <p className="muted">No pages yet. Fetch a verse and add it to the queue.</p>
      ) : (
        <ul className="page-queue-list">
          {pages.map((p) => {
            const isSelected = p.id === selectedId;
            return (
              <li
                key={p.id}
                className={
                  isSelected
                    ? "page-queue-item page-queue-item--selected"
                    : "page-queue-item"
                }
              >
                <div className="page-queue-item__bar">
                  <button
                    type="button"
                    className="page-queue-item__select"
                    onClick={() => onSelect(p.id)}
                  >
                    <span className="page-queue-item__ref">
                      {formatReference(p.ref)}
                    </span>
                    <span className="page-queue-item__meta">
                      {p.highlightsHi.length + p.highlightsEn.length > 0
                        ? `${p.highlightsHi.length + p.highlightsEn.length} highlight(s)`
                        : "No highlights"}
                    </span>
                  </button>
                  <label
                    className="page-queue-item__export"
                    title="Include in PNG/ZIP export"
                  >
                    <input
                      type="checkbox"
                      checked={exportPageIds.has(p.id)}
                      disabled={exportBusy}
                      onChange={(e) => onToggleExportPage(p.id, e.target.checked)}
                    />
                    <span className="sr-only">Export {formatReference(p.ref)}</span>
                  </label>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm page-queue-item__remove"
                    onClick={() => onRemove(p.id)}
                  >
                    Remove
                  </button>
                </div>

                {isSelected && selected && (
                  <div className="page-queue-item__highlights">
                    <HighlightEditor
                      label={labelHi}
                      text={selected.textHi}
                      highlights={selected.highlightsHi}
                      onChange={(h) => onUpdateHighlights("hi", h)}
                    />
                    <HighlightEditor
                      label={labelEn}
                      text={selected.textEn}
                      highlights={selected.highlightsEn}
                      onChange={(h) => onUpdateHighlights("en", h)}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {pages.length > 0 && (
        <div className="page-queue-panel__export">
          <div className="page-queue-panel__export-tools">
            <span className="page-queue-panel__export-label">Export</span>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={exportBusy}
              onClick={onExportSelectAll}
            >
              All
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={exportBusy || !selectedId}
              onClick={onExportSelectSelectedOnly}
            >
              Selected only
            </button>
          </div>
          <div className="export-actions">
            <button
              type="button"
              className="btn"
              disabled={pagesForExportCount === 0 || exportBusy}
              onClick={() => void onDownloadPng("live")}
            >
              Live PNG
            </button>
            <button
              type="button"
              className="btn"
              disabled={pagesForExportCount === 0 || exportBusy}
              onClick={() => void onDownloadPng("resolume")}
            >
              Resolume PNG
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={pagesForExportCount === 0 || exportBusy}
              onClick={() => void onDownloadZip("live")}
            >
              Live ZIP
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={pagesForExportCount === 0 || exportBusy}
              onClick={() => void onDownloadZip("resolume")}
            >
              Resolume ZIP
            </button>
          </div>
          {exportBusy && <p className="muted">Rendering…</p>}
        </div>
      )}
    </section>
  );
}
