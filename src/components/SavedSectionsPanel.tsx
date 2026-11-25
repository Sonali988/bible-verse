import { useState } from "react";
import type { SavedSection } from "../lib/savedSections";
import { formatReference } from "../lib/referenceParser";
import { CollapsiblePanel } from "./CollapsiblePanel";
import { ConfirmModal } from "./ConfirmModal";

type Props = {
  sections: SavedSection[];
  exportBusy: boolean;
  onCreateSection: (name: string) => void;
  onRenameSection: (sectionId: string, name: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onCopyToQueue: (sectionId: string, pageId: string) => void | Promise<void>;
  onMoveToQueue: (sectionId: string, pageId: string) => void | Promise<void>;
  onCopyAllToQueue: (sectionId: string) => void | Promise<void>;
  onRemoveFromSection: (sectionId: string, pageId: string) => void;
  className?: string;
  /** Tighter layout for the left data panel (full-width section titles). */
  compact?: boolean;
};

export function SavedSectionsPanel({
  sections,
  exportBusy,
  onCreateSection,
  onRenameSection,
  onDeleteSection,
  onCopyToQueue,
  onMoveToQueue,
  onCopyAllToQueue,
  onRemoveFromSection,
  className = "saved-sections-panel",
  compact = false,
}: Props) {
  const [deleteTarget, setDeleteTarget] = useState<SavedSection | null>(null);
  const [newSectionOpen, setNewSectionOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");

  const totalSaved = sections.reduce((n, s) => n + s.pages.length, 0);

  return (
    <>
      <CollapsiblePanel
        title="Saved sections"
        subtitle="Saved verses — add to the page queue when you need them."
        badge={totalSaved > 0 ? totalSaved : undefined}
        defaultOpen={compact}
        className={
          compact ? `${className} saved-sections-panel--compact` : className
        }
      >
        <div className="saved-sections-panel__toolbar">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={exportBusy}
            onClick={() => {
              setNewSectionName("");
              setNewSectionOpen(true);
            }}
          >
            New section
          </button>
        </div>

        {sections.length === 0 ? (
          <p className="muted saved-sections-panel__empty">
            No saved sections yet. Use <strong>Save</strong> on a queue card to park
            verses for a future service.
          </p>
        ) : (
          <ul className="saved-sections-panel__list">
            {sections.map((section) => (
              <li key={section.id} className="saved-section-block">
                <SavedSectionBlock
                  compact={compact}
                  section={section}
                  exportBusy={exportBusy}
                  onRename={(name) => onRenameSection(section.id, name)}
                  onDelete={() => setDeleteTarget(section)}
                  onCopyToQueue={(pageId) => void onCopyToQueue(section.id, pageId)}
                  onMoveToQueue={(pageId) => void onMoveToQueue(section.id, pageId)}
                  onCopyAll={() => void onCopyAllToQueue(section.id)}
                  onRemovePage={(pageId) =>
                    onRemoveFromSection(section.id, pageId)
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </CollapsiblePanel>

      {newSectionOpen ? (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => setNewSectionOpen(false)}
        >
          <div
            className="modal panel save-section-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal__head">
              <h2>New saved section</h2>
              <button
                type="button"
                className="btn btn--ghost btn--sm modal__close"
                aria-label="Close"
                onClick={() => setNewSectionOpen(false)}
              >
                ×
              </button>
            </div>
            <p className="confirm-modal__message">
              Name this group of verses (for example the service date).
            </p>
            <label className="save-section-modal__field">
              <span className="save-section-modal__label">Section name</span>
              <input
                type="text"
                className="save-section-modal__input"
                value={newSectionName}
                autoFocus
                placeholder="e.g. Easter week"
                onChange={(e) => setNewSectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onCreateSection(newSectionName.trim() || "Saved verses");
                    setNewSectionOpen(false);
                  }
                }}
              />
            </label>
            <div className="save-section-modal__actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setNewSectionOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  onCreateSection(newSectionName.trim() || "Saved verses");
                  setNewSectionOpen(false);
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete section"
        message={
          deleteTarget
            ? deleteTarget.pages.length > 0
              ? `Delete “${deleteTarget.name}” and its ${deleteTarget.pages.length} saved verse(s)?`
              : `Delete empty section “${deleteTarget.name}”?`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Keep"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) onDeleteSection(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </>
  );
}

function SavedSectionBlock({
  section,
  exportBusy,
  compact,
  onRename,
  onDelete,
  onCopyToQueue,
  onMoveToQueue,
  onCopyAll,
  onRemovePage,
}: {
  section: SavedSection;
  exportBusy: boolean;
  compact: boolean;
  onRename: (name: string) => void;
  onDelete: () => void;
  onCopyToQueue: (pageId: string) => void;
  onMoveToQueue: (pageId: string) => void;
  onCopyAll: () => void;
  onRemovePage: (pageId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(section.name);

  const commitRename = () => {
    const next = editName.trim();
    if (next && next !== section.name) onRename(next);
    setEditing(false);
  };

  return (
    <div
      className={
        open
          ? "saved-section-block__inner saved-section-block__inner--open"
          : "saved-section-block__inner"
      }
    >
      <div
        className={
          compact
            ? "saved-section-block__head saved-section-block__head--stacked"
            : "saved-section-block__head"
        }
      >
        <button
          type="button"
          className="saved-section-block__toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="saved-section-block__chevron" aria-hidden />
          {editing ? (
            <input
              type="text"
              className="saved-section-block__name-input"
              value={editName}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setEditName(section.name);
                  setEditing(false);
                }
              }}
            />
          ) : (
            <span className="saved-section-block__name" title={section.name}>
              {section.name}
            </span>
          )}
          <span className="badge saved-section-block__count">
            {section.pages.length}
          </span>
        </button>
        <div className="saved-section-block__tools">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={exportBusy || section.pages.length === 0}
            title="Copy all verses into the page queue"
            onClick={onCopyAll}
          >
            {compact ? "All → queue" : "Add all"}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={exportBusy}
            onClick={(e) => {
              e.stopPropagation();
              setEditName(section.name);
              setEditing(true);
              setOpen(true);
            }}
          >
            Rename
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={exportBusy}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {open && (
        <div className="saved-section-block__body">
          {section.pages.length === 0 ? (
            <p className="muted">No verses in this section.</p>
          ) : (
            <ul className="saved-section-block__pages">
              {section.pages.map((p) => (
                <li
                  key={p.id}
                  className={
                    compact
                      ? "saved-section-page saved-section-page--compact"
                      : "saved-section-page"
                  }
                >
                  <span className="saved-section-page__ref">
                    {formatReference(p.ref)}
                  </span>
                  <span className="saved-section-page__actions">
                    <button
                      type="button"
                      className="btn btn--sm"
                      disabled={exportBusy}
                      onClick={() => onCopyToQueue(p.id)}
                    >
                      {compact ? "Copy" : "Add to queue"}
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      disabled={exportBusy}
                      title="Copy into queue and remove from this section"
                      onClick={() => onMoveToQueue(p.id)}
                    >
                      {compact ? "Move" : "Move to queue"}
                    </button>
                    <button
                      type="button"
                      className="page-queue-chip__remove"
                      aria-label={`Remove ${formatReference(p.ref)} from section`}
                      disabled={exportBusy}
                      onClick={() => onRemovePage(p.id)}
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}