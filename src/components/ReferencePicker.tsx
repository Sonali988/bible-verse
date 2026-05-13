import { useEffect, useMemo, useState } from "react";
import type { BibleProvider } from "../bible/provider";
import type { VerseRef } from "../bible/types";
import { parseReference, formatReference } from "../lib/referenceParser";

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
  const [verseStart, setVerseStart] = useState(1);
  const [verseEnd, setVerseEnd] = useState(1);
  const [maxVerse, setMaxVerse] = useState(1);
  const [quick, setQuick] = useState("");
  const [error, setError] = useState<string | null>(null);

  const ready = providerEn.isReady() && providerHi.isReady();

  useEffect(() => {
    if (!ready) {
      setBooks([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const b = await providerEn.listBooks();
      if (!cancelled) setBooks(b);
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
      setVerseStart((v) => Math.min(v, Math.max(1, mv)));
      setVerseEnd((v) => Math.min(v, Math.max(1, mv)));
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId, chapter, providerEn, ready]);

  const refObj: VerseRef | null = useMemo(() => {
    if (!bookId) return null;
    return {
      bookId,
      chapter,
      verseStart,
      verseEnd: Math.max(verseStart, verseEnd),
    };
  }, [bookId, chapter, verseStart, verseEnd]);

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

  const applyQuick = () => {
    const p = parseReference(quick);
    if (!p) {
      setError("Could not parse reference. Example: John 3:16 or Jn 3:16-17");
      return;
    }
    setError(null);
    setBookId(p.bookId);
    setChapter(p.chapter);
    setVerseStart(p.verseStart);
    setVerseEnd(p.verseEnd);
  };

  return (
    <section className="panel">
      <h2>Reference</h2>
      {!ready && (
        <p className="warn">Load NKJV and Hindi SQLite files to enable lookup.</p>
      )}
      <div className="grid2">
        <label>
          Quick entry
          <input
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            placeholder="e.g. John 3:16 or Jn 3:16-17"
          />
        </label>
        <div className="btn-row">
          <button type="button" className="btn" onClick={applyQuick}>
            Apply quick entry
          </button>
        </div>
      </div>
      <div className="grid4">
        <label>
          Book
          <select
            value={bookId}
            onChange={(e) => setBookId(e.target.value)}
            disabled={!ready}
          >
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Chapter
          <select
            value={chapter}
            onChange={(e) => setChapter(Number(e.target.value))}
            disabled={!ready}
          >
            {chapters.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Verse start
          <input
            type="number"
            min={1}
            max={maxVerse}
            value={verseStart}
            onChange={(e) => setVerseStart(Number(e.target.value))}
            disabled={!ready}
          />
        </label>
        <label>
          Verse end
          <input
            type="number"
            min={verseStart}
            max={maxVerse}
            value={verseEnd}
            onChange={(e) => setVerseEnd(Number(e.target.value))}
            disabled={!ready}
          />
        </label>
      </div>
      {refObj && (
        <p className="muted">
          Current: <strong>{formatReference(refObj)}</strong>
        </p>
      )}
      {error && <p className="error">{error}</p>}
      <button type="button" className="btn btn--primary" onClick={fetchPreview} disabled={!ready}>
        Fetch English + Hindi
      </button>
    </section>
  );
}
