import { useEffect, useId, useState } from "react";
import type { SavedSection } from "../lib/savedSections";

type Props = {
  open: boolean;
  title: string;
  message: string;
  sections: SavedSection[];
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (sectionId: string) => void;
  onCreateSection: (name: string) => string;
};

export function SaveToSectionModal({
  open,
  title,
  message,
  sections,
  confirmLabel = "Move to section",
  onClose,
  onConfirm,
  onCreateSection,
}: Props) {
  const selectId = useId();
  const newNameId = useId();
  const [sectionId, setSectionId] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [mode, setMode] = useState<"existing" | "new">(
    sections.length > 0 ? "existing" : "new",
  );

  useEffect(() => {
    if (!open) return;
    setMode(sections.length > 0 ? "existing" : "new");
    setSectionId(sections[0]?.id ?? "");
    setNewName("");
  }, [open, sections]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = () => {
    if (mode === "new") {
      const name = newName.trim() || "Saved verses";
      const id = onCreateSection(name);
      onConfirm(id);
      onClose();
      return;
    }
    if (!sectionId) return;
    onConfirm(sectionId);
    onClose();
  };

  const canSubmit = mode === "new" ? true : Boolean(sectionId);

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="modal panel save-section-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-section-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <h2 id="save-section-modal-title">{title}</h2>
          <button
            type="button"
            className="btn btn--ghost btn--sm modal__close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <p className="confirm-modal__message">{message}</p>

        <div className="save-section-modal__mode">
          <label className="save-section-modal__radio">
            <input
              type="radio"
              name="save-section-mode"
              checked={mode === "existing"}
              disabled={sections.length === 0}
              onChange={() => setMode("existing")}
            />
            Existing section
          </label>
          <label className="save-section-modal__radio">
            <input
              type="radio"
              name="save-section-mode"
              checked={mode === "new"}
              onChange={() => setMode("new")}
            />
            New section
          </label>
        </div>

        {mode === "existing" ? (
          <label className="save-section-modal__field" htmlFor={selectId}>
            <span className="save-section-modal__label">Section</span>
            <select
              id={selectId}
              className="save-section-modal__select"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.pages.length})
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="save-section-modal__field" htmlFor={newNameId}>
            <span className="save-section-modal__label">Section name</span>
            <input
              id={newNameId}
              type="text"
              className="save-section-modal__input"
              value={newName}
              placeholder="e.g. Mar 9 service"
              onChange={(e) => setNewName(e.target.value)}
            />
          </label>
        )}

        <div className="save-section-modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}