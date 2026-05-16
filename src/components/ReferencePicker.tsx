import { useEffect, useMemo, useState, type MouseEvent } from "react";
import type { BibleProvider } from "../bible/provider";
import type { VerseRef } from "../bible/types";
import { parseReference, formatReference } from "../lib/referenceParser";

type SliderHoverTip = { verse: number; percent: number };

function verseAtSliderPointer(
  el: HTMLInputElement,
  clientX: number,
): SliderHoverTip {
  const rect = el.getBoundingClientRect();
  const width = rect.width || 1;
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / width));
  const min = Number(el.min) || 1;
  const max = Number(el.max) || min;
  const verse = Math.round(min + ratio * (max - min));
  return { verse, percent: ratio * 100 };
}

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
  const [quick, setQuick] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sliderHover, setSliderHover] = useState<SliderHoverTip | null>(null);

  const ready = providerEn.isReady() && providerHi.isReady();

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

  const applyQuick = () => {
    const p = parseReference(quick);
    if (!p) {
      setError("Could not parse reference. Example: John 3:16 or Jn 3:16");
      return;
    }
    setError(null);
    setBookId(p.bookId);
    setChapter(p.chapter);
    setVerse(p.verse);
  };

  const onVerseSliderHover = (e: MouseEvent<HTMLInputElement>) => {
    setSliderHover(verseAtSliderPointer(e.currentTarget, e.clientX));
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
            placeholder="e.g. John 3:16 or Jn 3:16"
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
        <label className="toolbar-field reference-picker-verse">
          <span>Verse: {verse}</span>
          <div className="reference-picker-verse-slider">
            {sliderHover && ready && (
              <span
                className="reference-picker-verse-tooltip"
                style={{ left: `${sliderHover.percent}%` }}
              >
                {sliderHover.verse}
              </span>
            )}
            <input
              type="range"
              min={1}
              max={maxVerse}
              step={1}
              value={verse}
              onChange={(e) => setVerse(Number(e.target.value))}
              onMouseMove={onVerseSliderHover}
              onMouseEnter={onVerseSliderHover}
              onMouseLeave={() => setSliderHover(null)}
              disabled={!ready}
            />
          </div>
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
