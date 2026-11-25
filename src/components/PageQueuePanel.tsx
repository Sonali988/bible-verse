import { useEffect, useState } from "react";
import type { HighlightRange, VersePage } from "../bible/types";
import type { SavedSection } from "../lib/savedSections";
import { formatReference } from "../lib/referenceParser";
import { ConfirmModal } from "./ConfirmModal";
import { HighlightEditor } from "./HighlightEditor";
import { SaveToSectionModal } from "./SaveToSectionModal";
import { VerseTitleModal } from "./VerseTitleModal";

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
  onUpdateTitles: (patch: { titleHiOverride?: string; titleEnOverride?: string }) => void;
  labelEn: string;
  labelHi: string;
  savedSections: SavedSection[];
  onCreateSection: (name: string) => string;
  onMovePageToSection: (pageId: string, sectionId: string) => void;
  onMoveAllPagesToSection: (sectionId: string) => void;
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
  onUpdateTitles,
  labelEn,
  labelHi,
  savedSections,
  onCreateSection,
  onMovePageToSection,
  onMoveAllPagesToSection,
}: Props) {
  const [removeAllConfirmOpen, setRemoveAllConfirmOpen] = useState(false);
  const [titleModalOpen, setTitleModalOpen] = useState(false);
  const [saveModal, setSaveModal] = useState<
    { kind: "one"; pageId: string } | { kind: "all" } | null
  >(null);

  useEffect(() => {
    setTitleModalOpen(false);
  }, [selectedId]);

  return (
    <section className="panel page-queue-panel">
      <div className="page-queue-panel__head">
        <div>
          <h2>Page queue</h2>
          <p className="hint page-queue-panel__hint">
            Click a reference to open highlight editing.
          </p>
        </div>
        <div className="page-queue-panel__head-actions">
          {pages.length > 0 && <span className="badge">{pages.length}</span>}
          {pages.length > 0 && (
            <>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={exportBusy}
                onClick={() => setSaveModal({ kind: "all" })}
              >
                Save all…
              </button>
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
                    className="page-queue-chip__save btn btn--ghost btn--sm"
                    aria-label={`Save ${formatReference(p.ref)} for later`}
                    disabled={exportBusy}
                    title="Move to saved section"
                    onClick={() => setSaveModal({ kind: "one", pageId: p.id })}
                  >
                    Save
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
                <div className="page-queue-highlights__head-actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setTitleModalOpen(true)}
                  >
                    Edit title
                  </button>
                  <span className="page-queue-highlights__badge">Edit mode</span>
                </div>
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

      {selected && (
        <VerseTitleModal
          open={titleModalOpen}
          page={selected}
          labelEn={labelEn}
          labelHi={labelHi}
          onUpdateTitles={onUpdateTitles}
          onClose={() => setTitleModalOpen(false)}
        />
      )}

      <SaveToSectionModal
        open={saveModal !== null}
        title={saveModal?.kind === "all" ? "Save all verses" : "Save verse"}
        message={
          saveModal?.kind === "all"
            ? "Move every card in the page queue into a saved section. They will leave the queue until you add them back."
            : "Move this card into a saved section. It will leave the page queue until you add it back."
        }
        sections={savedSections}
        onClose={() => setSaveModal(null)}
        onCreateSection={onCreateSection}
        onConfirm={(sectionId) => {
          if (!saveModal) return;
          if (saveModal.kind === "all") onMoveAllPagesToSection(sectionId);
          else onMovePageToSection(saveModal.pageId, sectionId);
        }}
      />
    </section>
  );
}
