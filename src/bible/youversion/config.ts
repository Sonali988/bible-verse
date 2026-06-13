export type YouVersionBibleConfig = {
  bibleId: number;
  abbreviation: string;
  label: string;
};

/** The Passion Translation — YouVersion Platform bible id 1849. */
export const YOUVERSION_TPT: YouVersionBibleConfig = {
  bibleId: 1849,
  abbreviation: "TPT",
  label: "TPT",
};

/** Hindi HHBD — YouVersion Platform bible id 819. */
export const YOUVERSION_HHBD: YouVersionBibleConfig = {
  bibleId: 819,
  abbreviation: "HHBD",
  label: "HHBD",
};

export function youVersionAppKey(): string {
  const key = import.meta.env.VITE_YOUVERSION_APP_KEY?.trim();
  if (!key) {
    throw new Error(
      "YouVersion app key is not configured. Set VITE_YOUVERSION_APP_KEY in your environment.",
    );
  }
  return key;
}
