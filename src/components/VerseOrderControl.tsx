import type { VerseBlockOrder } from "../lib/verseBlockOrder";

type Props = {
  value: VerseBlockOrder;
  onChange: (order: VerseBlockOrder) => void;
};

export function VerseOrderControl({ value, onChange }: Props) {
  return (
    <div className="verse-order-control">
      <p className="design-toolbar__section-label">Verse order</p>
      <label className="toolbar-field toolbar-field--wide">
        <span>Stack order (Live & Resolume previews)</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as VerseBlockOrder)}
        >
          <option value="hi-first">Hindi above English</option>
          <option value="en-first">English above Hindi</option>
        </select>
      </label>
    </div>
  );
}
