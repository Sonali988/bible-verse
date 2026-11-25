import { useCallback, useEffect, useState } from "react";
import type { BibleProvider } from "../bible/provider";
import type { LayoutSpec, TypographySpec, VerseDraftItem, VersePage } from "../bible/types";
import { computeAutoFitBodyFontOverrides } from "../lib/fitVerseBodyFont";
import { newId } from "../lib/id";
import {
  copyVersePageToQueue,
  createSavedSection,
  normalizeSavedSections,
  type SavedSection,
} from "../lib/savedSections";
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
  initialSavedSections: SavedSection[] | undefined,
  providerEn: BibleProvider,
  providerHi: BibleProvider,
  design: DesignContext,
) {
  const [pages, setPages] = useState<VersePage[]>(initialPages ?? []);
  const [savedSections, setSavedSections] = useState<SavedSection[]>(
    initialSavedSections ?? [],
  );
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

  const addDraftItems = useCallback(
    async (items: VerseDraftItem[]) => {
      if (!items.length) return;
      await document.fonts.ready;
      const newPages: VersePage[] = items.map((item) => ({
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
    },
    [providerEn.versionLabel, providerHi.versionLabel, design, selectPage],
  );

  const addPage = useCallback(async () => {
    if (!draft?.length) return;
    await addDraftItems(draft);
  }, [draft, addDraftItems]);

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

  const updateSelectedTitles = useCallback(
    (patch: { titleHiOverride?: string; titleEnOverride?: string }) => {
      if (!selected) return;
      setPages((list) =>
        list.map((p) => {
          if (p.id !== selected.id) return p;
          const next = { ...p };
          if ("titleHiOverride" in patch) {
            const value = patch.titleHiOverride?.trim();
            if (value) next.titleHiOverride = value;
            else delete next.titleHiOverride;
          }
          if ("titleEnOverride" in patch) {
            const value = patch.titleEnOverride?.trim();
            if (value) next.titleEnOverride = value;
            else delete next.titleEnOverride;
          }
          return next;
        }),
      );
    },
    [selected],
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

  const createSection = useCallback((name: string) => {
    const section = createSavedSection(name);
    setSavedSections((prev) => [...prev, section]);
    return section.id;
  }, []);

  const renameSection = useCallback((sectionId: string, name: string) => {
    const trimmed = name.trim().slice(0, 120);
    if (!trimmed) return;
    setSavedSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, name: trimmed } : s)),
    );
  }, []);

  const deleteSection = useCallback((sectionId: string) => {
    setSavedSections((prev) => prev.filter((s) => s.id !== sectionId));
  }, []);

  const movePageToSection = useCallback(
    (pageId: string, sectionId: string) => {
      setPages((list) => {
        const page = list.find((p) => p.id === pageId);
        if (!page) return list;
        setSavedSections((sections) =>
          sections.map((s) =>
            s.id === sectionId
              ? { ...s, pages: [...s.pages, page] }
              : s,
          ),
        );
        if (selectedId === pageId) {
          const rest = list.filter((p) => p.id !== pageId);
          setSelectedId(rest[0]?.id ?? null);
        }
        return list.filter((p) => p.id !== pageId);
      });
    },
    [selectedId],
  );

  const moveAllPagesToSection = useCallback((sectionId: string) => {
    setPages((list) => {
      if (list.length === 0) return list;
      setSavedSections((sections) =>
        sections.map((s) =>
          s.id === sectionId ? { ...s, pages: [...s.pages, ...list] } : s,
        ),
      );
      setSelectedId(null);
      return [];
    });
  }, []);

  const removePageFromSection = useCallback(
    (sectionId: string, pageId: string) => {
      setSavedSections((sections) =>
        sections.map((s) =>
          s.id === sectionId
            ? { ...s, pages: s.pages.filter((p) => p.id !== pageId) }
            : s,
        ),
      );
    },
    [],
  );

  const copyPageFromSectionToQueue = useCallback(
    async (sectionId: string, pageId: string) => {
      const section = savedSections.find((s) => s.id === sectionId);
      const source = section?.pages.find((p) => p.id === pageId);
      if (!source) return;
      await document.fonts.ready;
      const copy = copyVersePageToQueue(source, design);
      setPages((p) => [...p, copy]);
      selectPage(copy.id, "both");
    },
    [savedSections, design, selectPage],
  );

  const movePageFromSectionToQueue = useCallback(
    async (sectionId: string, pageId: string) => {
      const section = savedSections.find((s) => s.id === sectionId);
      const source = section?.pages.find((p) => p.id === pageId);
      if (!source) return;
      await document.fonts.ready;
      const copy = copyVersePageToQueue(source, design);
      setPages((p) => [...p, copy]);
      removePageFromSection(sectionId, pageId);
      selectPage(copy.id, "both");
    },
    [savedSections, design, removePageFromSection, selectPage],
  );

  const copyAllFromSectionToQueue = useCallback(
    async (sectionId: string) => {
      const section = savedSections.find((s) => s.id === sectionId);
      if (!section?.pages.length) return;
      await document.fonts.ready;
      const copies = section.pages.map((p) => copyVersePageToQueue(p, design));
      setPages((prev) => [...prev, ...copies]);
      selectPage(copies[0]!.id, "both");
    },
    [savedSections, design, selectPage],
  );

  const replaceSavedSections = useCallback((next: SavedSection[]) => {
    setSavedSections(normalizeSavedSections(next, providerEn.versionLabel, providerHi.versionLabel));
  }, [providerEn.versionLabel, providerHi.versionLabel]);

  return {
    pages,
    setPages,
    savedSections,
    setSavedSections: replaceSavedSections,
    selectedId,
    selected,
    draft,
    selectPage,
    onPreview,
    addPage,
    addDraftItems,
    updateSelectedHighlights,
    updateSelectedText,
    updateSelectedTitles,
    removePage,
    removeAllPages,
    createSection,
    renameSection,
    deleteSection,
    movePageToSection,
    moveAllPagesToSection,
    removePageFromSection,
    copyPageFromSectionToQueue,
    movePageFromSectionToQueue,
    copyAllFromSectionToQueue,
  };
}