import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  CARD_LAYOUT,
  clampLayoutTextToLeftHalf,
  cloneLayout,
  cloneResolumeLayout,
  defaultResolumeTypography,
  defaultTypography,
  mergePageTypography,
  normalizeTypography,
  type LayoutSpec,
  type PageTypographyOverrides,
  type TypographySpec,
  type VersePage,
} from "../bible/types";
import { DEFAULT_VERSE_BLOCK_ORDER, type PersistedState } from "../lib/storage";
import type { VerseBlockOrder } from "../lib/verseBlockOrder";

type PersistedDesign = Partial<
  Pick<
    PersistedState,
    "cardLayout" | "typography" | "resolumeLayout" | "resolumeTypography" | "verseBlockOrder"
  >
>;

export function useCardDesign(persisted: PersistedDesign) {
  const [cardLayout, setCardLayout] = useState<LayoutSpec>(() =>
    clampLayoutTextToLeftHalf(persisted.cardLayout ?? cloneLayout(CARD_LAYOUT)),
  );
  const [typography, setTypography] = useState<TypographySpec>(() =>
    normalizeTypography(persisted.typography ?? null),
  );
  const [resolumeLayout, setResolumeLayout] = useState<LayoutSpec>(
    () => persisted.resolumeLayout ?? cloneResolumeLayout(),
  );
  const [resolumeTypography, setResolumeTypography] = useState<TypographySpec>(() =>
    normalizeTypography(persisted.resolumeTypography ?? defaultResolumeTypography()),
  );
  const [verseBlockOrder, setVerseBlockOrder] = useState<VerseBlockOrder>(
    () => persisted.verseBlockOrder ?? DEFAULT_VERSE_BLOCK_ORDER,
  );

  const updateCardLayout = useCallback(
    (fn: (prev: LayoutSpec) => LayoutSpec) => {
      setCardLayout((prev) => clampLayoutTextToLeftHalf(fn(prev)));
    },
    [],
  );

  const updateTypography = useCallback(
    (fn: (prev: TypographySpec) => TypographySpec) => {
      setTypography((prev) => normalizeTypography(fn(prev)));
    },
    [],
  );

  const updateResolumeLayout = useCallback(
    (fn: (prev: LayoutSpec) => LayoutSpec) => {
      setResolumeLayout((prev) => fn(prev));
    },
    [],
  );

  const updateResolumeTypography = useCallback(
    (fn: (prev: TypographySpec) => TypographySpec) => {
      setResolumeTypography((prev) => normalizeTypography(fn(prev)));
    },
    [],
  );

  const resetCardDesign = useCallback(
    (setPages: Dispatch<SetStateAction<VersePage[]>>) => {
      setCardLayout(cloneLayout(CARD_LAYOUT));
      setTypography(normalizeTypography(defaultTypography()));
      setPages((ps) => ps.map(({ typographySizes: _ts, ...rest }) => ({ ...rest })));
    },
    [],
  );

  const resetResolumeDesign = useCallback(
    (setPages: Dispatch<SetStateAction<VersePage[]>>) => {
      setResolumeLayout(cloneResolumeLayout());
      setResolumeTypography(normalizeTypography(defaultResolumeTypography()));
      setPages((ps) =>
        ps.map(({ resolumeTypographySizes: _rs, ...rest }) => ({ ...rest })),
      );
    },
    [],
  );

  const updatePageTypographyForSelected = useCallback(
    (
      selectedId: string | null,
      patch: PageTypographyOverrides,
      sizesKey: "typographySizes" | "resolumeTypographySizes",
      setPages: Dispatch<SetStateAction<VersePage[]>>,
    ) => {
      if (!selectedId) return;
      setPages((list) =>
        list.map((p) =>
          p.id !== selectedId
            ? p
            : {
                ...p,
                [sizesKey]: { ...p[sizesKey], ...patch },
              },
        ),
      );
    },
    [],
  );

  const previewScale = useMemo(
    () =>
      Math.min(0.5, Math.min(880, cardLayout.width / 2) / cardLayout.width),
    [cardLayout.width],
  );

  const previewScaledSize = useMemo(
    () => ({
      w: Math.max(1, Math.round(cardLayout.width * previewScale)),
      h: Math.max(1, Math.round(cardLayout.height * previewScale)),
    }),
    [cardLayout.width, cardLayout.height, previewScale],
  );

  const previewScaleResolume = useMemo(
    () =>
      Math.min(0.5, Math.min(880, resolumeLayout.width / 2) / resolumeLayout.width),
    [resolumeLayout.width],
  );

  const previewScaledSizeResolume = useMemo(
    () => ({
      w: Math.max(1, Math.round(resolumeLayout.width * previewScaleResolume)),
      h: Math.max(1, Math.round(resolumeLayout.height * previewScaleResolume)),
    }),
    [resolumeLayout.width, resolumeLayout.height, previewScaleResolume],
  );

  const selectedLiveTypography = useCallback(
    (selected: VersePage | null) =>
      selected ? mergePageTypography(typography, selected) : typography,
    [typography],
  );

  const selectedResolumeTypography = useCallback(
    (selected: VersePage | null) =>
      selected
        ? mergePageTypography(resolumeTypography, selected, "resolumeTypographySizes")
        : resolumeTypography,
    [resolumeTypography],
  );

  return {
    cardLayout,
    typography,
    resolumeLayout,
    resolumeTypography,
    verseBlockOrder,
    setVerseBlockOrder,
    updateCardLayout,
    updateTypography,
    updateResolumeLayout,
    updateResolumeTypography,
    resetCardDesign,
    resetResolumeDesign,
    updatePageTypographyForSelected,
    previewScale,
    previewScaledSize,
    previewScaleResolume,
    previewScaledSizeResolume,
    selectedLiveTypography,
    selectedResolumeTypography,
  };
}
