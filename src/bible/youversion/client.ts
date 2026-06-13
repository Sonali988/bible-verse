import type { VerseRef } from "../types";
import type { YouVersionBibleConfig } from "./config";
import { youVersionAppKey } from "./config";
import { chapterRefToPassageId, verseRefToPassageId } from "./usfm";

const API_ORIGIN = "https://api.youversion.com";

type PassageResponse = {
  id?: string;
  content?: string;
  reference?: string;
};

type VerseListResponse = {
  data?: { id?: string }[];
};

function requestHeaders(): HeadersInit {
  return {
    accept: "application/json",
    "x-yvp-app-key": youVersionAppKey(),
  };
}

function passageUrl(config: YouVersionBibleConfig, passageId: string): string {
  const encoded = encodeURIComponent(passageId);
  return `${API_ORIGIN}/v1/bibles/${config.bibleId}/passages/${encoded}?format=text`;
}

function chapterVersesUrl(
  config: YouVersionBibleConfig,
  bookUsfm: string,
  chapter: number,
): string {
  return `${API_ORIGIN}/v1/bibles/${config.bibleId}/books/${bookUsfm}/chapters/${chapter}/verses`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: requestHeaders() });
  if (!res.ok) {
    throw new Error(`YouVersion API request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function fetchVerseText(
  ref: VerseRef,
  config: YouVersionBibleConfig,
): Promise<string> {
  const passageId = verseRefToPassageId(ref);
  const data = await fetchJson<PassageResponse>(passageUrl(config, passageId));
  const text = data.content?.trim() ?? "";
  if (!text) {
    throw new Error(`No verse text returned for ${passageId}`);
  }
  return text;
}

export async function fetchMaxVerseInChapter(
  ref: VerseRef,
  config: YouVersionBibleConfig,
): Promise<number> {
  const passageId = chapterRefToPassageId(ref);
  const bookUsfm = passageId.split(".")[0];
  if (!bookUsfm) return 0;

  const data = await fetchJson<VerseListResponse>(
    chapterVersesUrl(config, bookUsfm, ref.chapter),
  );
  let max = 0;
  for (const verse of data.data ?? []) {
    const n = Number(verse.id);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}
