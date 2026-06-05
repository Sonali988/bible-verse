import { useState } from "react";
import type { HighlightRange, VersePage } from "../bible/types";
import { formatReference } from "../lib/referenceParser";
import { ConfirmModal } from "./ConfirmModal";
import { HighlightEditor } from "./HighlightEditor";

type Props = {
  pages: VersePage[];
  selectedId: string | null;
  selected: VersePage | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onRemoveAll: () => void;
  exportBusy: boolean;
  onOpenExport: () => void;
  onUpdateHighlights: (lang: "en" | "hi", ranges: HighlightRange[]) => void;
  onUpdateText: (lang: "en" | "hi", text: string) => void;
  labelEn: string;
  labelHi: string;
};

function highlightCount(p: VersePage): number {
  return p.highlightsHi.length + p.highlightsEn.length;
}

export function PageQueuePanel({
  pages,
  selectedId,
  selected,
  onSelect,
  onRemove,
  onRemoveAll,
  exportBusy,
  onOpenExport,
  onUpdateHighlights,
  onUpdateText,
  labelEn,
  labelHi,
}: Props) {
  const [removeAllConfirmOpen, setRemoveAllConfirmOpen] = useState(false);

  return (
    <section className="panel page-queue-panel">
      <div className="page-queue-panel__head">
        <div>
          <h2>Page queue</h2>
          <p className="hint page-queue-panel__hint">
            Chip strip below — click a reference to open highlight editing.
          </p>
        </div>
        <div className="page-queue-panel__head-actions">
          {pages.length > 0 && <span className="badge">{pages.length}</span>}
          {pages.length > 0 && (
            <>
              <button
                type="button"
                className="btn btn--ghost btn--sm page-queue-panel__remove-all"
                disabled={exportBusy}
                onClick={() => setRemoveAllConfirmOpen(true)}
              >
                Remove all
              </button>
              <button
                type="button"
                className="btn btn--primary btn--sm page-queue-panel__export"
                disabled={exportBusy}
                onClick={onOpenExport}
              >
                Export…
              </button>
            </>
          )}
        </div>
      </div>

      {pages.length === 0 ? (
        <p className="muted">No pages yet. Fetch a verse and add it to the queue.</p>
      ) : (
        <>
          <div
            className="page-queue-strip"
            role="listbox"
            aria-label="Page queue"
          >
            {pages.map((p) => {
              const isSelected = p.id === selectedId;
              const hi = highlightCount(p);
              return (
                <div key={p.id} className="page-queue-chip-wrap">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={
                      isSelected
                        ? "page-queue-chip page-queue-chip--selected"
                        : "page-queue-chip"
                    }
                    title={formatReference(p.ref)}
                    onClick={() => onSelect(p.id)}
                  >
                    <span className="page-queue-chip__ref">
                      {formatReference(p.ref)}
                    </span>
                    <span
                      className={
                        hi > 0
                          ? "page-queue-chip__count page-queue-chip__count--active"
                          : "page-queue-chip__count"
                      }
                    >
                      {hi}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="page-queue-chip__remove"
                    aria-label={`Remove ${formatReference(p.ref)}`}
                    onClick={() => onRemove(p.id)}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          {selected && (
            <div className="page-queue-highlights page-queue-highlights--edit">
              <div className="page-queue-highlights__head">
                <div>
                  <p className="page-queue-highlights__title">
                    Edit highlights — {formatReference(selected.ref)}
                  </p>
                  <p className="hint page-queue-highlights__hint">
                    Select text in each box below to add highlights on the card.
                  </p>
                </div>
                <span className="page-queue-highlights__badge">Edit mode</span>
              </div>
              <HighlightEditor
                key={`${selected.id}-hi`}
                label={selected.versionLabelHi ?? labelHi}
                text={selected.textHi}
                highlights={selected.highlightsHi}
                onChange={(h) => onUpdateHighlights("hi", h)}
                allowTextEdit
                onTextChange={(t) => onUpdateText("hi", t)}
              />
              <HighlightEditor
                key={`${selected.id}-en`}
                label={selected.versionLabelEn ?? labelEn}
                text={selected.textEn}
                highlights={selected.highlightsEn}
                onChange={(h) => onUpdateHighlights("en", h)}
                allowTextEdit
                onTextChange={(t) => onUpdateText("en", t)}
              />
            </div>
          )}
        </>
      )}

      <ConfirmModal
        open={removeAllConfirmOpen}
        title="Remove all verses"
        message="Do you really want to delete all the verses you created?"
        confirmLabel="Remove all"
        cancelLabel="Keep verses"
        onConfirm={onRemoveAll}
        onClose={() => setRemoveAllConfirmOpen(false)}
      />
    </section>
  );
}
