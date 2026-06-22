export type BibleComVersionConfig = {
  versionId: number;
  locale: string;
  versionAbbr: string;
  label: string;
};

/** Hindi Open Bible (BSI) — HINOVBSI on Bible.com (versionId=1683). */
export const BIBLE_COM_HI: BibleComVersionConfig = {
  versionId: 1683,
  locale: "hi",
  versionAbbr: "HINOVBSI",
  label: "HINOVBSI",
};
