import { STANDARD_BOOKS, hindiBookNameById } from "../bible/books";
import type { VerseRef } from "../bible/types";

const ABBREV = new Map<string, string>(
  [
    ["gn", "1"],
    ["ge", "1"],
    ["gen", "1"],
    ["ex", "2"],
    ["exo", "2"],
    ["lev", "3"],
    ["lv", "3"],
    ["nu", "4"],
    ["num", "4"],
    ["dt", "5"],
    ["deut", "5"],
    ["jos", "6"],
    ["josh", "6"],
    ["jdg", "7"],
    ["judg", "7"],
    ["ru", "8"],
    ["rth", "8"],
    ["1sa", "9"],
    ["1sam", "9"],
    ["2sa", "10"],
    ["2sam", "10"],
    ["1ki", "11"],
    ["1kgs", "11"],
    ["2ki", "12"],
    ["2kgs", "12"],
    ["1ch", "13"],
    ["1chr", "13"],
    ["2ch", "14"],
    ["2chr", "14"],
    ["ezr", "15"],
    ["neh", "16"],
    ["ne", "16"],
    ["est", "17"],
    ["job", "18"],
    ["ps", "19"],
    ["psa", "19"],
    ["psalm", "19"],
    ["pr", "20"],
    ["prov", "20"],
    ["eccl", "21"],
    ["ec", "21"],
    ["so", "22"],
    ["song", "22"],
    ["sos", "22"],
    ["isa", "23"],
    ["jer", "24"],
    ["la", "25"],
    ["lam", "25"],
    ["eze", "26"],
    ["ezk", "26"],
    ["da", "27"],
    ["dan", "27"],
    ["hos", "28"],
    ["joe", "29"],
    ["jl", "29"],
    ["am", "30"],
    ["obad", "31"],
    ["jon", "32"],
    ["mic", "33"],
    ["na", "34"],
    ["hab", "35"],
    ["zep", "36"],
    ["hag", "37"],
    ["zec", "38"],
    ["mal", "39"],
    ["mt", "40"],
    ["matt", "40"],
    ["mk", "41"],
    ["mrk", "41"],
    ["lk", "42"],
    ["luk", "42"],
    ["jn", "43"],
    ["jhn", "43"],
    ["john", "43"],
    ["ac", "44"],
    ["act", "44"],
    ["ro", "45"],
    ["rom", "45"],
    ["1co", "46"],
    ["1cor", "46"],
    ["2co", "47"],
    ["2cor", "47"],
    ["gal", "48"],
    ["eph", "49"],
    ["php", "50"],
    ["phil", "50"],
    ["col", "51"],
    ["1th", "52"],
    ["1thess", "52"],
    ["2th", "53"],
    ["2thess", "53"],
    ["1ti", "54"],
    ["1tim", "54"],
    ["2ti", "55"],
    ["2tim", "55"],
    ["tit", "56"],
    ["phm", "57"],
    ["pm", "57"],
    ["heb", "58"],
    ["jas", "59"],
    ["jm", "59"],
    ["1pe", "60"],
    ["1pet", "60"],
    ["2pe", "61"],
    ["2pet", "61"],
    ["1jn", "62"],
    ["1john", "62"],
    ["2jn", "63"],
    ["3jn", "64"],
    ["jud", "65"],
    ["jd", "65"],
    ["rev", "66"],
    ["re", "66"],
  ].map(([k, v]) => [k, v] as [string, string]),
);

const NAME_TO_ID = new Map<string, string>();
for (const b of STANDARD_BOOKS) {
  NAME_TO_ID.set(b.name.toLowerCase().replace(/\s+/g, ""), b.id);
  NAME_TO_ID.set(b.name.toLowerCase(), b.id);
}

export function parseReference(input: string): VerseRef | null {
  const s = input.trim();
  if (!s) return null;
  const m = s.match(
    /^([\w.\s]+?)\s+(\d+)\s*:\s*(\d+)(?:\s*-\s*(\d+))?\s*$/i,
  );
  if (!m) return null;
  const bookPart = m[1].trim().replace(/\./g, "").toLowerCase();
  const chapter = Number(m[2]);
  const verseStart = Number(m[3]);
  const verseEnd = m[4] ? Number(m[4]) : verseStart;
  if (!chapter || !verseStart || verseEnd < verseStart) return null;

  const bookId =
    ABBREV.get(bookPart) ??
    NAME_TO_ID.get(bookPart.replace(/\s+/g, "")) ??
    NAME_TO_ID.get(bookPart);
  if (!bookId) return null;

  return { bookId, chapter, verseStart, verseEnd };
}

export function formatReference(ref: VerseRef): string {
  const name =
    STANDARD_BOOKS.find((b) => b.id === ref.bookId)?.name ?? `Book ${ref.bookId}`;
  if (ref.verseStart === ref.verseEnd) {
    return `${name} ${ref.chapter}:${ref.verseStart}`;
  }
  return `${name} ${ref.chapter}:${ref.verseStart}-${ref.verseEnd}`;
}

/** Hindi book name + chapter:verse(s), e.g. `गलातियों 3:5` or `गलातियों 3:5-7`. */
export function formatHindiReference(ref: VerseRef): string {
  const name = hindiBookNameById(ref.bookId);
  if (ref.verseStart === ref.verseEnd) {
    return `${name} ${ref.chapter}:${ref.verseStart}`;
  }
  return `${name} ${ref.chapter}:${ref.verseStart}-${ref.verseEnd}`;
}
