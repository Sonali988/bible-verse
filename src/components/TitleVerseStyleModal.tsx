import { useEffect } from "react";
import type { PageTypographyOverrides, TypographySpec } from "../bible/types";

type Props = {
  open: boolean;
  previewLabel: string;
  typography: TypographySpec;
  enabled: boolean;
  onUpdate: (patch: PageTypographyOverrides) => void;
  onClose: () => void;
};

export function TitleVerseStyleModal({
  open,
  previewLabel,
  typography,
  enabled,
  onUpdate,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const titleId = `title-verse-style-modal-${previewLabel.toLowerCase()}`;

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal panel title-verse-style-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <h2 id={titleId}>Verse alignment</h2>
          <button
            type="button"
            className="btn btn--ghost btn--sm modal__close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {!enabled && (
          <p className="hint" style={{ marginTop: 0 }}>
            Click a card in the {previewLabel} preview to edit verse alignment for that card only.
          </p>
        )}

        <div className="design-toolbar__row design-toolbar__row--controls">
          <label className="toolbar-field">
            <span>Verse align</span>
            <select
              value={typography.textAlign}
              disabled={!enabled}
              onChange={(e) =>
                onUpdate({
                  textAlign: e.target.value as TypographySpec["textAlign"],
                })
              }
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
              <option value="justify">Justify (fill line width)</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
