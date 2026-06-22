import { useEffect, useId, useRef } from "react";

type Props = {
  open: boolean;
  languageLabel: string;
  disabled?: boolean;
  disabledReason?: string;
  onClose: () => void;
  onFile: (file: File) => void | Promise<void>;
};

export function SqliteUploadModal({
  open,
  languageLabel,
  disabled = false,
  disabledReason,
  onClose,
  onFile,
}: Props) {
  const titleId = useId();
  const hintId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) inputRef.current && (inputRef.current.value = "");
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal panel sqlite-upload-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={hintId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <h2 id={titleId}>Upload {languageLabel} SQLite</h2>
          <button
            type="button"
            className="btn btn--ghost btn--sm modal__close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {disabled ? (
          <p className="hint sqlite-upload-modal__hint">
            {disabledReason ??
              `Upload is not available for the current ${languageLabel} source.`}
          </p>
        ) : (
          <>
            <p id={hintId} className="hint sqlite-upload-modal__hint">
              Choose a <code>.sqlite</code> Bible database from your device. Table
              layout is detected automatically.
            </p>
            <label className="sqlite-upload-modal__file">
              SQLite file
              <input
                ref={inputRef}
                type="file"
                accept=".sqlite,.db,application/x-sqlite3,*/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  void Promise.resolve(onFile(file)).finally(onClose);
                }}
              />
            </label>
          </>
        )}

        <div className="sqlite-upload-modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
