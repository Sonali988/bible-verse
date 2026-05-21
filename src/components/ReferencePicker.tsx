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
      setError("Load both SQLite databases (or enable sample data).");
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
          <select
            className="reference-picker__select"
            value={chapter}
            onChange={(e) => setChapter(Number(e.target.value))}
            disabled={!ready || !bookId}
          >
            {chapters.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

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
