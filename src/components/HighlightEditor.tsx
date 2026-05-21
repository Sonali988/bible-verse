import type { HighlightRange } from "../bible/types";

type Props = {
  label: string;
  text: string;
  highlights: HighlightRange[];
  onChange: (next: HighlightRange[]) => void;
};

export function HighlightEditor({ label, text, highlights, onChange }: Props) {
  const addFromSelection = (ta: HTMLTextAreaElement | null) => {
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (end <= start) return;
    onChange([...highlights, { start, end }].sort((a, b) => a.start - b.start));
  };

  const clear = () => onChange([]);

  return (
    <div className="highlight-editor highlight-editor--edit">
      <div className="highlight-editor__head">
        <strong>{label}</strong>
        <button type="button" className="btn btn--ghost" onClick={clear}>
          Clear highlights
        </button>
      </div>
      <textarea
        className="highlight-editor__ta"
        readOnly
        value={text}
        onMouseUp={(e) => addFromSelection(e.currentTarget)}
        onKeyUp={(e) => addFromSelection(e.currentTarget)}
        rows={5}
        aria-label={`Selectable verse text for ${label}`}
      />
      <p className="hint">
        Select text in the box, then release the mouse to add a yellow highlight.
        Repeat for multiple ranges.
      </p>
      <ul className="highlight-list">
        {highlights.map((h, i) => (
          <li key={`${h.start}-${h.end}-${i}`}>
            <code>
              {h.start}:{h.end}
            </code>{" "}
            <span className="muted">{text.slice(h.start, h.end)}</span>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() =>
                onChange(highlights.filter((_, j) => j !== i))
              }
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
