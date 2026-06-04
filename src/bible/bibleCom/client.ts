import type { VerseRef } from "../types";
import type { BibleComVersionConfig } from "./config";
import { chapterUsfm, verseRefToUsfm } from "./usfm";

const BIBLE_COM_ORIGIN = "https://www.bible.com";

/** From Bible.com `/_next/data/{buildId}/…` URLs (see working curl / Postman). */
const DEFAULT_BUILD_ID = "vcuzbdBv_SIZ_f3GG-wrL";

type VersePageResponse = {
  pageProps?: {
    verses?: { content?: string }[];
  };
};

type ChapterPageResponse = {
  pageProps?: {
    chapterInfo?: { content?: string };
  };
};

function requestHeaders(): HeadersInit {
  return {
    accept: "*/*",
    "x-nextjs-data": "1",
    referer: "https://www.bible.com/",
  };
}

function dataUrl(config: BibleComVersionConfig, usfm: string): string {
  const encoded = encodeURIComponent(usfm);
  return `${BIBLE_COM_ORIGIN}/_next/data/${DEFAULT_BUILD_ID}/${config.locale}/bible/${config.versionId}/${usfm}.json?versionId=${config.versionId}&usfm=${encoded}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: requestHeaders() });
  if (!res.ok) {
    throw new Error(`Bible.com request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function fetchVerseText(
  ref: VerseRef,
  config: BibleComVersionConfig,
): Promise<string> {
  const usfm = verseRefToUsfm(ref, config.versionAbbr);
  const data = await fetchJson<VersePageResponse>(dataUrl(config, usfm));
  const text = data.pageProps?.verses?.[0]?.content?.trim() ?? "";
  if (!text) {
    throw new Error(`No verse text returned for ${usfm}`);
  }
  return text;
}

/** Best-effort max verse in chapter from chapter HTML content. */
export async function fetchMaxVerseInChapter(
  ref: VerseRef,
  config: BibleComVersionConfig,
): Promise<number> {
  const usfm = chapterUsfm(ref, config.versionAbbr);
  const data = await fetchJson<ChapterPageResponse>(dataUrl(config, usfm));
  const content = data.pageProps?.chapterInfo?.content ?? "";
  let max = 0;
  const re = /\s(\d{1,3})\s+(?=[A-Za-z\u0900-\u097F"([])/g;
  for (const match of content.matchAll(re)) {
    const n = Number(match[1]);
    if (n > max) max = n;
  }
  return max;
}
