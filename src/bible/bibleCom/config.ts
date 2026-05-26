export type BibleComVersionConfig = {
  versionId: number;
  locale: string;
  versionAbbr: string;
  label: string;
};

/** King James Version — matches the Bible.com curl example (versionId=1). */
export const BIBLE_COM_EN: BibleComVersionConfig = {
  versionId: 1,
  locale: "en",
  versionAbbr: "KJV",
  label: "KJV",
};

/** Hindi Open Bible (BSI) — HINOVBSI on Bible.com (versionId=1683). */
export const BIBLE_COM_HI: BibleComVersionConfig = {
  versionId: 1683,
  locale: "hi",
  versionAbbr: "HINOVBSI",
  label: "HINOVBSI",
};
