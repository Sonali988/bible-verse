import { useState } from "react";
import type { HighlightRange } from "../bible/types";

type Props = {
  label: string;
  text: string;
  highlights: HighlightRange[];
  onChange: (next: HighlightRange[]) => void;
  allowTextEdit?: boolean;
  onTextChange?: (text: string) => void;
};

export function HighlightEditor({
  label,
  text,
  highlights,
  onChange,
  allowTextEdit = false,
  onTextChange,
}: Props) {
  const [editingText, setEditingText] = useState(false);
  const [draftText, setDraftText] = useState(text);

  const addFromSelection = (ta: HTMLTextAreaElement | null) => {
    if (editingText || !ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (end <= start) return;
    onChange([...highlights, { start, end }].sort((a, b) => a.start - b.start));
  };

  const clear = () => onChange([]);

  const startTextEdit = () => {
    setDraftText(text);
    setEditingText(true);
  };

  const cancelTextEdit = () => {
    setDraftText(text);
    setEditingText(false);
  };

  const saveTextEdit = () => {
    if (draftText !== text) {
      onTextChange?.(draftText);
    }
    setEditingText(false);
  };

  return (
    <div
      className={
        editingText
          ? "highlight-editor highlight-editor--edit highlight-editor--text-edit"
          : "highlight-editor highlight-editor--edit"
      }
    >
      <div className="highlight-editor__head">
        <strong>{label}</strong>
        <div className="highlight-editor__actions">
          {editingText ? (
            <>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={saveTextEdit}
              >
                Save text
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={cancelTextEdit}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              {allowTextEdit && (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={startTextEdit}
                >
                  Edit text
                </button>
              )}
              <button type="button" className="btn btn--ghost" onClick={clear}>
                Clear highlights
              </button>
            </>
          )}
        </div>
      </div>
      <textarea
        className="highlight-editor__ta"
        readOnly={!editingText}
        value={editingText ? draftText : text}
        onChange={
          editingText ? (e) => setDraftText(e.target.value) : undefined
        }
        onMouseUp={(e) => addFromSelection(e.currentTarget)}
        onKeyUp={(e) => addFromSelection(e.currentTarget)}
        rows={5}
        aria-label={
          editingText
            ? `Editable verse text for ${label}`
            : `Selectable verse text for ${label}`
        }
      />
      <p className="hint">
        {editingText
          ? "Update the verse text, then click Save text. Highlights are cleared when text changes."
          : "Select text in the box, then release the mouse to add a yellow highlight. Repeat for multiple ranges."}
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
