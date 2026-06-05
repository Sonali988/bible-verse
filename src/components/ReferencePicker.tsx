import { useEffect, useMemo, useState } from "react";
import type { BibleProvider } from "../bible/provider";
import type { VerseDraftItem, VerseRef } from "../bible/types";
import {
  isNewTestamentBookId,
  partitionBooksByTestament,
} from "../bible/books";
import { formatReference, formatReferenceRange } from "../lib/referenceParser";

const MAX_VERSES_PER_FETCH = 50;

type Props = {
  providerEn: BibleProvider;
  providerHi: BibleProvider;
  onPreview: (items: VerseDraftItem[]) => void;
};

export function ReferencePicker({
  providerEn,
  providerHi,
  onPreview,
}: Props) {
  const [books, setBooks] = useState<{ id: string; name: string }[]>([]);
  const [bookId, setBookId] = useState("");
  const [chapters, setChapters] = useState<number[]>([]);
  const [chapter, setChapter] = useState(1);
  const [verse, setVerse] = useState(1);
  const [verseEnd, setVerseEnd] = useState(1);
  const [maxVerse, setMaxVerse] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [chapterOpen, setChapterOpen] = useState(false);
  const [fetching, setFetching] = useState(false);

  const ready = providerEn.isReady() && providerHi.isReady();

  const verseStart = Math.min(verse, verseEnd);
  const verseStop = Math.max(verse, verseEnd);
  const verseCount = verseStop - verseStart + 1;

  const verseNumbers = useMemo(
    () => Array.from({ length: maxVerse }, (_, i) => i + 1),
    [maxVerse],
  );

  const { oldTestament, newTestament } = useMemo(
    () => partitionBooksByTestament(books),
    [books],
  );

  const isNewTestament = isNewTestamentBookId(bookId);

  useEffect(() => {
    if (!ready) {
      setBooks([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const b = await providerEn.listBooks();
        if (!cancelled) {
          setBooks(b);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setBooks([]);
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [providerEn, ready]);

  useEffect(() => {
    if (books.length && !books.some((b) => b.id === bookId)) {
      setBookId(books[0].id);
    }
  }, [books, bookId]);

  useEffect(() => {
    if (!ready || !bookId) return;
    let cancelled = false;
    void (async () => {
      const ch = await providerEn.listChapters(bookId);
      if (cancelled) return;
      setChapters(ch);
      const ch0 = ch[0] ?? 1;
      setChapter((c) => (ch.includes(c) ? c : ch0));
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId, providerEn, ready]);

  useEffect(() => {
    if (!chapterOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setChapterOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chapterOpen]);

  useEffect(() => {
    if (!ready || !bookId) return;
    let cancelled = false;
    void (async () => {
      const mv = await providerEn.getMaxVerse(bookId, chapter);
      if (cancelled) return;
      const max = Math.max(1, mv);
      setMaxVerse(max);
      setVerse((v) => {
        const next = Math.min(Math.max(1, v), max);
        setVerseEnd((e) => Math.min(Math.max(next, e), max));
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId, chapter, providerEn, ready]);

  const refLabel = useMemo(() => {
    if (!bookId) return null;
    return formatReferenceRange(bookId, chapter, verse, verseEnd);
  }, [bookId, chapter, verse, verseEnd]);

  const selectVerseStart = (v: number) => {
    setVerse(v);
    setVerseEnd(v);
  };

  const verseEndOptions = useMemo(
    () => verseNumbers.filter((v) => v >= verse),
    [verseNumbers, verse],
  );

  const fetchPreview = async () => {
    setError(null);
    if (!bookId || !ready) {
      setError(
        "Enable Bible.com and/or load SQLite for each language, or turn on sample data.",
      );
      return;
    }
    if (verseCount > MAX_VERSES_PER_FETCH) {
      setError(`Select at most ${MAX_VERSES_PER_FETCH} verses at a time.`);
      return;
    }
    setFetching(true);
    try {
      const verseList = Array.from(
        { length: verseCount },
        (_, i) => verseStart + i,
      );
      const items: VerseDraftItem[] = await Promise.all(
        verseList.map(async (v) => {
          const ref: VerseRef = { bookId, chapter, verse: v };
          const [textEn, textHi] = await Promise.all([
            providerEn.getPassage(ref),
            providerHi.getPassage(ref),
          ]);
          return { ref, textEn, textHi };
        }),
      );
      const anyText = items.some((it) => it.textEn.trim() || it.textHi.trim());
      if (!anyText) {
        setError("No verse text found for this reference in one or both databases.");
      }
      onPreview(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setFetching(false);
    }
  };

  return (
    <section className="panel panel--compact">
      <h2>Reference</h2>
      {!ready && (
        <p className="warn">Load English and Hindi SQLite files to enable lookup.</p>
      )}
      <div className="reference-picker__controls">
        <label className="reference-picker__field reference-picker__field--book">
          <span>Old Testament</span>
          <select
            className="reference-picker__select"
            value={isNewTestament ? "" : bookId}
            onChange={(e) => {
              const id = e.target.value;
              if (id) {
                setBookId(id);
                setChapterOpen(true);
              }
            }}
            disabled={!ready || oldTestament.length === 0}
          >
            <option value="">Book…</option>
            {oldTestament.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="reference-picker__field reference-picker__field--book">
          <span>New Testament</span>
          <select
            className="reference-picker__select"
            value={isNewTestament ? bookId : ""}
            onChange={(e) => {
              const id = e.target.value;
              if (id) {
                setBookId(id);
                setChapterOpen(true);
              }
            }}
            disabled={!ready || newTestament.length === 0}
          >
            <option value="">Book…</option>
            {newTestament.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="reference-picker__field reference-picker__field--chapter">
          <span>Chapter</span>
          <input
            type="text"
            readOnly
            className="reference-picker__select reference-picker__chapter-input"
            value={chapter}
            disabled={!ready || !bookId}
            aria-haspopup="dialog"
            aria-expanded={chapterOpen}
            onClick={() => {
              if (ready && bookId) setChapterOpen(true);
            }}
          />
        </label>
        <label className="reference-picker__field reference-picker__field--verse-end">
          <span>Verse end</span>
          <select
            className="reference-picker__select reference-picker__verse-end-input"
            value={verseEnd}
            disabled={!ready || !bookId}
            aria-label={`Verse end, ${verse} through ${maxVerse}`}
            onChange={(e) => setVerseEnd(Number(e.target.value))}
          >
            {verseEndOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>

      {chapterOpen && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => setChapterOpen(false)}
        >
          <div
            className="modal panel chapter-picker-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="chapter-picker-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal__head">
              <h2 id="chapter-picker-title">Select chapter</h2>
              <button
                type="button"
                className="btn btn--ghost btn--sm modal__close"
                aria-label="Close"
                onClick={() => setChapterOpen(false)}
              >
                ×
              </button>
            </div>
            <div
              className="chapter-grid"
              role="group"
              aria-label="Select chapter"
            >
              {chapters.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={
                    c === chapter
                      ? "verse-chip verse-chip--active"
                      : "verse-chip"
                  }
                  aria-pressed={c === chapter}
                  onClick={() => {
                    setChapter(c);
                    setChapterOpen(false);
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="reference-picker__verses">
        <span className="reference-picker__verses-label">Verse</span>
        <div
          className="verse-chip-strip"
          role="group"
          aria-label="Select start verse"
        >
          {verseNumbers.map((v) => {
            const inRange = v >= verseStart && v <= verseStop;
            const isStart = v === verse;
            return (
              <button
                key={v}
                type="button"
                className={
                  isStart
                    ? "verse-chip verse-chip--active"
                    : inRange
                      ? "verse-chip verse-chip--in-range"
                      : "verse-chip"
                }
                disabled={!ready}
                aria-pressed={isStart}
                onClick={() => selectVerseStart(v)}
              >
                {v}
              </button>
            );
          })}
        </div>
      </div>
      {verseCount > 1 && (
        <p className="hint reference-picker__range-hint">
          {verseCount} verses — each becomes its own card in the queue.
        </p>
      )}

      {error && <p className="error">{error}</p>}
      <div className="reference-picker__actions">
        {refLabel && (
          <span className="chip chip--accent reference-picker__ref-chip">
            {refLabel}
          </span>
        )}
        <button
          type="button"
          className="btn btn--primary reference-picker__fetch"
          onClick={() => void fetchPreview()}
          disabled={!ready || fetching}
        >
          {fetching
            ? "Fetching…"
            : verseCount > 1
              ? `Fetch ${verseCount} verses`
              : "Fetch English + Hindi"}
        </button>
      </div>
    </section>
  );
}
