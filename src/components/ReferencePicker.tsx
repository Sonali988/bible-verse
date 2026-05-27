import { useEffect, useMemo, useState } from "react";
import type { BibleProvider } from "../bible/provider";
import type { VerseRef } from "../bible/types";
import {
  isNewTestamentBookId,
  partitionBooksByTestament,
} from "../bible/books";
import { formatReference } from "../lib/referenceParser";

type Props = {
  providerEn: BibleProvider;
  providerHi: BibleProvider;
  onPreview: (ref: VerseRef, textEn: string, textHi: string) => void;
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
  const [maxVerse, setMaxVerse] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [chapterOpen, setChapterOpen] = useState(false);

  const ready = providerEn.isReady() && providerHi.isReady();

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
    setChapterOpen(false);
  }, [bookId]);

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
      setMaxVerse(Math.max(1, mv));
      setVerse((v) => Math.min(v, Math.max(1, mv)));
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId, chapter, providerEn, ready]);

  const refObj: VerseRef | null = useMemo(() => {
    if (!bookId) return null;
    return { bookId, chapter, verse };
  }, [bookId, chapter, verse]);

  const fetchPreview = async () => {
    setError(null);
    if (!refObj || !ready) {
      setError(
        "Enable Bible.com and/or load SQLite for each language, or turn on sample data.",
      );
      return;
    }
    try {
      const [textEn, textHi] = await Promise.all([
        providerEn.getPassage(refObj),
        providerHi.getPassage(refObj),
      ]);
      if (!textEn.trim() && !textHi.trim()) {
        setError("No verse text found for this reference in one or both databases.");
      }
      onPreview(refObj, textEn, textHi);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <section className="panel panel--compact">
      <h2>Reference</h2>
      {!ready && (
        <p className="warn">Load NKJV and Hindi SQLite files to enable lookup.</p>
      )}
      <div className="reference-picker__controls">
        <label className="reference-picker__field reference-picker__field--book">
          <span>Old Testament</span>
          <select
            className="reference-picker__select"
            value={isNewTestament ? "" : bookId}
            onChange={(e) => {
              const id = e.target.value;
              if (id) setBookId(id);
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
              if (id) setBookId(id);
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
        <div className="verse-chip-strip" role="group" aria-label="Select verse">
          {verseNumbers.map((v) => (
            <button
              key={v}
              type="button"
              className={
                v === verse ? "verse-chip verse-chip--active" : "verse-chip"
              }
              disabled={!ready}
              aria-pressed={v === verse}
              onClick={() => setVerse(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {refObj && (
        <p className="muted reference-picker__current">
          <span className="chip chip--accent">{formatReference(refObj)}</span>
        </p>
      )}
      {error && <p className="error">{error}</p>}
      <button
        type="button"
        className="btn btn--primary reference-picker__fetch"
        onClick={() => void fetchPreview()}
        disabled={!ready}
      >
        Fetch English + Hindi
      </button>
    </section>
  );
}
