import { useState } from "react";
import {
  MAX_VERSE_BODY_FONT_PX,
  type PageTypographyOverrides,
  type TypographySpec,
} from "../bible/types";
import { TitleVerseStyleModal } from "./TitleVerseStyleModal";

type Props = {
  previewLabel: string;
  typography: TypographySpec;
  enabled: boolean;
  onUpdate: (patch: PageTypographyOverrides) => void;
};

function Num({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}) {
  return (
    <label className="toolbar-field">
      <span>{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function PxSlider({
  label,
  value,
  onChange,
  min,
  max,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  disabled?: boolean;
}) {
  const safeValue = Number.isFinite(value) ? Math.round(value) : min;
  return (
    <label className="toolbar-field toolbar-field--verse-range">
      <span>
        {label}: {safeValue}
      </span>
      <input
        type="range"
        value={safeValue}
        min={min}
        max={max}
        step={1}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function clampVersePx(n: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.max(6, Math.min(MAX_VERSE_BODY_FONT_PX, Math.round(n)));
}

export function CardPreviewTypographyControls({
  previewLabel,
  typography,
  enabled,
  onUpdate,
}: Props) {
  const [styleModalOpen, setStyleModalOpen] = useState(false);

  return (
    <div
      className="design-toolbar preview-typography-controls"
      aria-label={`${previewLabel} card typography`}
    >
      {!enabled && (
        <p className="hint" style={{ marginTop: 0, marginBottom: "0.5rem" }}>
          Click a card in this preview to edit typography for that card only. Changes here do not
          affect the other preview.
        </p>
      )}

      <div className="design-toolbar__section-head">
        <p className="design-toolbar__section-label">Typography</p>
        <button
          type="button"
          className="btn btn--sm design-toolbar__section-action"
          onClick={() => setStyleModalOpen(true)}
        >
          Colors & alignment
        </button>
      </div>
      <div className="design-toolbar__row design-toolbar__row--controls">
        <Num
          label="Hindi title (px)"
          value={typography.titleFontPxHi}
          min={8}
          max={200}
          disabled={!enabled}
          onChange={(titleFontPxHi) => onUpdate({ titleFontPxHi })}
        />
        <Num
          label="English title (px)"
          value={typography.titleFontPxEn}
          min={8}
          max={200}
          disabled={!enabled}
          onChange={(titleFontPxEn) => onUpdate({ titleFontPxEn })}
        />
        <PxSlider
          label="Hindi verse (px)"
          value={typography.bodyFontPxHi}
          min={6}
          max={MAX_VERSE_BODY_FONT_PX}
          disabled={!enabled}
          onChange={(n) =>
            onUpdate({
              bodyFontPxHi: clampVersePx(n, typography.bodyFontPxHi),
            })
          }
        />
        <PxSlider
          label="English verse (px)"
          value={typography.bodyFontPxEn}
          min={6}
          max={MAX_VERSE_BODY_FONT_PX}
          disabled={!enabled}
          onChange={(n) =>
            onUpdate({
              bodyFontPxEn: clampVersePx(n, typography.bodyFontPxEn),
            })
          }
        />
        <Num
          label="Hindi verse line height"
          value={typography.lineHeightHi}
          min={1}
          max={3}
          step={0.05}
          disabled={!enabled}
          onChange={(lineHeightHi) => onUpdate({ lineHeightHi })}
        />
        <Num
          label="English verse line height"
          value={typography.lineHeightEn}
          min={1}
          max={3}
          step={0.05}
          disabled={!enabled}
          onChange={(lineHeightEn) => onUpdate({ lineHeightEn })}
        />
      </div>

      <TitleVerseStyleModal
        open={styleModalOpen}
        previewLabel={previewLabel}
        typography={typography}
        enabled={enabled}
        onUpdate={onUpdate}
        onClose={() => setStyleModalOpen(false)}
      />
    </div>
  );
}
