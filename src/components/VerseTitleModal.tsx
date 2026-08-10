import { useEffect, useState } from "react";
import type { VersePage } from "../bible/types";
import { formatReference } from "../lib/referenceParser";
import {
  defaultVerseTitleEn,
  defaultVerseTitleHi,
  verseTitleEn,
  verseTitleHi,
} from "../lib/verseTitles";

type Props = {
  open: boolean;
  page: VersePage;
  labelEn: string;
  labelHi: string;
  onUpdateTitles: (patch: { titleHiOverride?: string; titleEnOverride?: string }) => void;
  onClose: () => void;
};

export function VerseTitleModal({
  open,
  page,
  labelEn,
  labelHi,
  onUpdateTitles,
  onClose,
}: Props) {
  const versionHi = page.versionLabelHi ?? labelHi;
  const versionEn = page.versionLabelEn ?? labelEn;
  const defaultTitleHi = defaultVerseTitleHi(page, versionHi);
  const defaultTitleEn = defaultVerseTitleEn(page, versionEn);

  const [titleHi, setTitleHi] = useState(() => verseTitleHi(page, versionHi));
  const [titleEn, setTitleEn] = useState(() => verseTitleEn(page, versionEn));

  useEffect(() => {
    if (!open) return;
    setTitleHi(verseTitleHi(page, versionHi));
    setTitleEn(verseTitleEn(page, versionEn));
  }, [open, page, versionHi, versionEn]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const titleId = "verse-title-modal-title";

  const commitTitles = () => {
    const hiTrim = titleHi.trim();
    const enTrim = titleEn.trim();
    onUpdateTitles({
      titleHiOverride: hiTrim && hiTrim !== defaultTitleHi ? hiTrim : "",
      titleEnOverride: enTrim && enTrim !== defaultTitleEn ? enTrim : "",
    });
    onClose();
  };

  const resetTitles = () => {
    setTitleHi(defaultTitleHi);
    setTitleEn(defaultTitleEn);
    onUpdateTitles({
      titleHiOverride: "",
      titleEnOverride: "",
    });
  };

  const hasCustomTitle =
    titleHi.trim() !== defaultTitleHi || titleEn.trim() !== defaultTitleEn;

  return (
    <div className="modal-overlay" role="presentation" onClick={commitTitles}>
      <div
        className="modal panel verse-title-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <h2 id={titleId}>Edit title — {formatReference(page.ref)}</h2>
          <button
            type="button"
            className="btn btn--ghost btn--sm modal__close"
            aria-label="Close"
            onClick={commitTitles}
          >
            ×
          </button>
        </div>

        <p className="hint verse-title-modal__hint">
          Titles are prefilled from the card. Click Done to save changes.
        </p>

        <div className="verse-title-modal__fields">
          <label className="toolbar-field toolbar-field--wide">
            <span>Hindi title</span>
            <input
              type="text"
              value={titleHi}
              onChange={(e) => setTitleHi(e.target.value)}
            />
          </label>
          <label className="toolbar-field toolbar-field--wide">
            <span>English title</span>
            <input
              type="text"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
            />
          </label>
        </div>

        <div className="verse-title-modal__actions">
          {hasCustomTitle && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={resetTitles}>
              Reset to default
            </button>
          )}
          <button type="button" className="btn btn--primary btn--sm" onClick={commitTitles}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
