import type { VerseDraftItem } from "../bible/types";
import { formatReference } from "../lib/referenceParser";

type Props = {
  draft: VerseDraftItem[];
  hindiLabel: string;
  englishLabel: string;
  onAdd: () => void;
};

export function VerseDraftPanel({
  draft,
  hindiLabel,
  englishLabel,
  onAdd,
}: Props) {
  return (
    <section className="panel verse-draft" aria-label="Verse draft (read-only)">
      <div className="verse-draft__head">
        <div>
          <h2 className="verse-draft__title">
            {draft.length === 1 ? "Verse draft" : `Verse draft (${draft.length})`}
          </h2>
          <p className="hint verse-draft__hint">
            Review fetched text before adding to the queue. Each verse becomes its own
            card. This section is not editable.
          </p>
        </div>
        <span className="verse-draft__badge">Read-only</span>
      </div>
      <div className="verse-draft__entries">
        {draft.map((item) => (
          <article
            key={`${item.ref.bookId}-${item.ref.chapter}-${item.ref.verse}`}
            className="verse-draft__entry"
          >
            <h3 className="verse-draft__entry-ref">{formatReference(item.ref)}</h3>
            <div className="verse-draft__body">
              <div className="verse-draft__col">
                <span className="verse-draft__label">{hindiLabel}</span>
                <p className="verse-draft__text">{item.textHi}</p>
              </div>
              <div className="verse-draft__col">
                <span className="verse-draft__label">{englishLabel}</span>
                <p className="verse-draft__text">{item.textEn}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="verse-draft__actions">
        <button type="button" className="btn btn--primary" onClick={onAdd}>
          {draft.length === 1
            ? "Add to page queue"
            : `Add ${draft.length} cards to queue`}
        </button>
      </div>
    </section>
  );
}
