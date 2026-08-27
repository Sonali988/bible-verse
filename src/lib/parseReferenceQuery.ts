import { STANDARD_BOOKS } from "../bible/books";
import type { VerseRef } from "../bible/types";

/** Compact form: lowercase, no spaces/periods. */
function compactBookKey(s: string): string {
  return s.toLowerCase().replace(/[\s.]+/g, "");
}

/**
 * Common abbreviations + full names (compact) → canonical book id.
 * Longer / more specific keys win when resolving prefixes.
 */
const BOOK_ALIASES: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const b of STANDARD_BOOKS) {
    map[compactBookKey(b.name)] = b.id;
  }
  const extras: [string, string][] = [
    ["gen", "1"],
    ["ex", "2"],
    ["exo", "2"],
    ["exod", "2"],
    ["lev", "3"],
    ["num", "4"],
    ["deut", "5"],
    ["dt", "5"],
    ["josh", "6"],
    ["judg", "7"],
    ["jdg", "7"],
    ["ru", "8"],
    ["1sam", "9"],
    ["2sam", "10"],
    ["1kgs", "11"],
    ["1ki", "11"],
    ["2kgs", "12"],
    ["2ki", "12"],
    ["1chr", "13"],
    ["1ch", "13"],
    ["2chr", "14"],
    ["2ch", "14"],
    ["neh", "16"],
    ["est", "17"],
    ["esth", "17"],
    ["ps", "19"],
    ["psa", "19"],
    ["psalm", "19"],
    ["prov", "20"],
    ["pr", "20"],
    ["eccl", "21"],
    ["ecc", "21"],
    ["song", "22"],
    ["sos", "22"],
    ["cant", "22"],
    ["isa", "23"],
    ["jer", "24"],
    ["lam", "25"],
    ["ezek", "26"],
    ["eze", "26"],
    ["dan", "27"],
    ["hos", "28"],
    ["obad", "31"],
    ["jon", "32"],
    ["mic", "33"],
    ["nah", "34"],
    ["hab", "35"],
    ["zeph", "36"],
    ["zep", "36"],
    ["hag", "37"],
    ["zech", "38"],
    ["zec", "38"],
    ["mal", "39"],
    ["matt", "40"],
    ["mt", "40"],
    ["mat", "40"],
    ["mk", "41"],
    ["mrk", "41"],
    ["lk", "42"],
    ["luk", "42"],
    ["jn", "43"],
    ["jhn", "43"],
    ["act", "44"],
    ["rom", "45"],
    ["1cor", "46"],
    ["1co", "46"],
    ["2cor", "47"],
    ["2co", "47"],
    ["gal", "48"],
    ["eph", "49"],
    ["phil", "50"],
    ["php", "50"],
    ["col", "51"],
    ["1thes", "52"],
    ["1thess", "52"],
    ["1th", "52"],
    ["2thes", "53"],
    ["2thess", "53"],
    ["2th", "53"],
    ["1tim", "54"],
    ["1ti", "54"],
    ["2tim", "55"],
    ["2ti", "55"],
    ["tit", "56"],
    ["phlm", "57"],
    ["phm", "57"],
    ["heb", "58"],
    ["jas", "59"],
    ["jam", "59"],
    ["1pet", "60"],
    ["1pe", "60"],
    ["1pt", "60"],
    ["2pet", "61"],
    ["2pe", "61"],
    ["2pt", "61"],
    ["1jn", "62"],
    ["1jhn", "62"],
    ["2jn", "63"],
    ["2jhn", "63"],
    ["3jn", "64"],
    ["3jhn", "64"],
    ["jud", "65"],
    ["rev", "66"],
    ["re", "66"],
    ["apoc", "66"],
  ];
  for (const [alias, id] of extras) {
    map[alias] = id;
  }
  return map;
})();

const ALIAS_KEYS = Object.keys(BOOK_ALIASES).sort((a, b) => b.length - a.length);

function resolveBookId(bookRaw: string): string | null {
  const key = compactBookKey(bookRaw);
  if (!key) return null;
  if (BOOK_ALIASES[key]) return BOOK_ALIASES[key]!;

  const prefixHits = ALIAS_KEYS.filter((k) => k.startsWith(key));
  if (prefixHits.length === 0) return null;

  const ids = [...new Set(prefixHits.map((k) => BOOK_ALIASES[k]!))];
  if (ids.length === 1) return ids[0]!;

  // Prefer the shortest compact full name among candidates (e.g. john over 1john for "jo" is ambiguous — require uniqueness)
  return null;
}

/**
 * Parse shorthand references: `Jn 3:16`, `Gen1:2`, `1thes2:1`, `Rev 2:21`.
 * Returns null if the query is not a chapter:verse reference.
 */
export function parseReferenceQuery(raw: string): VerseRef | null {
  const q = raw.trim();
  if (!q.includes(":")) return null;

  const m = q.match(/^(.+?)\s*(\d+)\s*:\s*(\d+)\s*$/);
  if (!m) return null;

  const bookRaw = m[1]!.trim();
  const chapter = Number(m[2]);
  const verse = Number(m[3]);
  if (!bookRaw || !Number.isFinite(chapter) || !Number.isFinite(verse)) return null;
  if (chapter < 1 || verse < 1) return null;

  // Bare "3:16" with no book
  if (/^\d+$/.test(compactBookKey(bookRaw))) return null;

  const bookId = resolveBookId(bookRaw);
  if (!bookId) return null;

  return { bookId, chapter, verse };
}

/** True when the query looks like book + chapter:verse (even if book is unknown). */
export function looksLikeReferenceQuery(raw: string): boolean {
  const q = raw.trim();
  return /^.+?\s*\d+\s*:\s*\d+\s*$/.test(q);
}
