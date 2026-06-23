import { useCallback, useEffect, useState } from "react";
import type { BibleProvider } from "../bible/provider";
import type { LayoutSpec, TypographySpec, VerseDraftItem, VersePage } from "../bible/types";
import { computeAutoFitBodyFontOverrides } from "../lib/fitVerseBodyFont";
import { newId } from "../lib/id";
import {
  scrollPreviewToPage,
  type PreviewScrollTarget,
} from "../lib/previewScroll";
import type { VerseBlockOrder } from "../lib/verseBlockOrder";

type DesignContext = {
  cardLayout: LayoutSpec;
  typography: TypographySpec;
  resolumeLayout: LayoutSpec;
  resolumeTypography: TypographySpec;
  verseBlockOrder: VerseBlockOrder;
};

export function usePageQueue(
  initialPages: VersePage[] | undefined,
  providerEn: BibleProvider,
  providerHi: BibleProvider,
  design: DesignContext,
) {
  const [pages, setPages] = useState<VersePage[]>(initialPages ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialPages?.[0]?.id ?? null,
  );
  const [draft, setDraft] = useState<VerseDraftItem[] | null>(null);

  const selected = pages.find((p) => p.id === selectedId) ?? null;

  const selectPage = useCallback((id: string, scrollTarget?: PreviewScrollTarget) => {
    setSelectedId(id);
    if (!scrollTarget) return;
    requestAnimationFrame(() => scrollPreviewToPage(id, scrollTarget));
  }, []);

  useEffect(() => {
    if (selectedId && !pages.some((p) => p.id === selectedId)) {
      setSelectedId(pages[0]?.id ?? null);
    }
  }, [pages, selectedId]);

  const onPreview = useCallback((items: VerseDraftItem[]) => {
    setDraft(items.length > 0 ? items : null);
  }, []);

  const addPage = useCallback(async () => {
    if (!draft?.length) return;
    await document.fonts.ready;
    const newPages: VersePage[] = draft.map((item) => ({
      id: newId(),
      ref: item.ref,
      textEn: item.textEn,
      textHi: item.textHi,
      versionLabelEn: providerEn.versionLabel,
      versionLabelHi: providerHi.versionLabel,
      highlightsEn: [],
      highlightsHi: [],
      typographySizes: computeAutoFitBodyFontOverrides(
        item,
        design.cardLayout,
        design.typography,
        design.verseBlockOrder,
      ),
      resolumeTypographySizes: computeAutoFitBodyFontOverrides(
        item,
        design.resolumeLayout,
        design.resolumeTypography,
        design.verseBlockOrder,
        "resolume",
      ),
    }));
    setPages((p) => [...p, ...newPages]);
    selectPage(newPages[0]!.id, "both");
    setDraft(null);
  }, [draft, providerEn.versionLabel, providerHi.versionLabel, design, selectPage]);

  const updateSelectedHighlights = useCallback(
    (lang: "en" | "hi", ranges: VersePage["highlightsEn"]) => {
      if (!selected) return;
      setPages((list) =>
        list.map((p) =>
          p.id !== selected.id
            ? p
            : {
                ...p,
                highlightsEn: lang === "en" ? ranges : p.highlightsEn,
                highlightsHi: lang === "hi" ? ranges : p.highlightsHi,
              },
        ),
      );
    },
    [selected],
  );

  const updateSelectedText = useCallback(
    (lang: "en" | "hi", text: string) => {
      if (!selected) return;
      setPages((list) =>
        list.map((p) => {
          if (p.id !== selected.id) return p;
          const updated = {
            ...p,
            textEn: lang === "en" ? text : p.textEn,
            textHi: lang === "hi" ? text : p.textHi,
            highlightsEn: lang === "en" ? [] : p.highlightsEn,
            highlightsHi: lang === "hi" ? [] : p.highlightsHi,
          };
          return {
            ...updated,
            typographySizes: computeAutoFitBodyFontOverrides(
              updated,
              design.cardLayout,
              design.typography,
              design.verseBlockOrder,
            ),
            resolumeTypographySizes: computeAutoFitBodyFontOverrides(
              updated,
              design.resolumeLayout,
              design.resolumeTypography,
              design.verseBlockOrder,
              "resolume",
            ),
          };
        }),
      );
    },
    [selected, design],
  );

  const removePage = useCallback(
    (id: string) => {
      setPages((xs) => xs.filter((x) => x.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [selectedId],
  );

  const removeAllPages = useCallback(() => {
    setPages([]);
    setSelectedId(null);
  }, []);

  return {
    pages,
    setPages,
    selectedId,
    selected,
    draft,
    selectPage,
    onPreview,
    addPage,
    updateSelectedHighlights,
    updateSelectedText,
    removePage,
    removeAllPages,
  };
}
