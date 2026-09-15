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

/** Hindi Standard Bible (HSB) — YouVersion Platform bible id 3540. */
export const YOUVERSION_HSB: YouVersionBibleConfig = {
  bibleId: 3540,
  abbreviation: "HSB",
  label: "HSB",
};

/** Hindi Contemporary Version (HCV) — YouVersion Platform bible id 1628. */
export const YOUVERSION_HCV: YouVersionBibleConfig = {
  bibleId: 1628,
  abbreviation: "HCV",
  label: "HCV",
};

/** Indian Revised Version Hindi 2019 (IRVHin) — YouVersion Platform bible id 1980. */
export const YOUVERSION_IRVHIN: YouVersionBibleConfig = {
  bibleId: 1980,
  abbreviation: "IRVHin",
  label: "IRVHin",
};

/** Hindi Literal Text (HLT) — YouVersion Platform bible id 4459. */
export const YOUVERSION_HLT: YouVersionBibleConfig = {
  bibleId: 4459,
  abbreviation: "HLT",
  label: "HLT",
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
