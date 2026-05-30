import type { VerseRef } from "../types";
import { BIBLE_COM_EN, BIBLE_COM_HI, type BibleComVersionConfig } from "./config";
import { chapterUsfm, verseRefToUsfm } from "./usfm";

const DEFAULT_BUILD_ID = "s5S1C6e_ILSA4q-0caNHr";

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

const buildIdByLocale = new Map<string, string>();

function bibleComOrigin(): string {
  if (import.meta.env.DEV) {
    return "/bible-com";
  }
  return "https://www.bible.com";
}

function requestHeaders(): HeadersInit {
  return {
    accept: "*/*",
    "x-nextjs-data": "1",
    referer: "https://www.bible.com/",
  };
}

async function resolveBuildId(locale: string): Promise<string> {
  const cached = buildIdByLocale.get(locale);
  if (cached) return cached;

  const version = locale === "hi" ? BIBLE_COM_HI : BIBLE_COM_EN;
  try {
    const probeUsfm = `JHN.1.1.${version.versionAbbr}`;
    const res = await fetch(
      `${bibleComOrigin()}/${locale}/bible/${version.versionId}/${probeUsfm}`,
      { headers: { accept: "text/html" } },
    );
    if (res.ok) {
      const html = await res.text();
      const match = html.match(/\/_next\/data\/([^/]+)\//);
      if (match?.[1]) {
        buildIdByLocale.set(locale, match[1]);
        return match[1];
      }
    }
  } catch {
    /* use fallback */
  }

  buildIdByLocale.set(locale, DEFAULT_BUILD_ID);
  return DEFAULT_BUILD_ID;
}

function dataUrl(
  buildId: string,
  config: BibleComVersionConfig,
  usfm: string,
): string {
  const encoded = encodeURIComponent(usfm);
  return `${bibleComOrigin()}/_next/data/${buildId}/${config.locale}/bible/${config.versionId}/${usfm}.json?versionId=${config.versionId}&usfm=${encoded}`;
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
  const buildId = await resolveBuildId(config.locale);
  const usfm = verseRefToUsfm(ref, config.versionAbbr);
  const data = await fetchJson<VersePageResponse>(dataUrl(buildId, config, usfm));
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
  const buildId = await resolveBuildId(config.locale);
  const usfm = chapterUsfm(ref, config.versionAbbr);
  const data = await fetchJson<ChapterPageResponse>(dataUrl(buildId, config, usfm));
  const content = data.pageProps?.chapterInfo?.content ?? "";
  let max = 0;
  const re = /\s(\d{1,3})\s+(?=[A-Za-z\u0900-\u097F"([])/g;
  for (const match of content.matchAll(re)) {
    const n = Number(match[1]);
    if (n > max) max = n;
  }
  return max;
}
