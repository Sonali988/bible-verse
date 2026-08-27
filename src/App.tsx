import { useEffect, useMemo, useState } from "react";
import type { AppBootstrapData } from "./AppBootstrap";
import { AppHeader } from "./components/AppHeader";
import { CardPreviewSection } from "./components/CardPreviewSection";
import { DataPanelSidebar } from "./components/DataPanelSidebar";
import { EditCardRail } from "./components/EditCardRail";
import { ExportModal } from "./components/ExportModal";
import { PageQueuePanel } from "./components/PageQueuePanel";
import { ReferencePicker } from "./components/ReferencePicker";
import { SqliteUploadModal } from "./components/SqliteUploadModal";
import { VerseDraftPanel } from "./components/VerseDraftPanel";
import type { ExportVariant } from "./export/exportVariant";
import { useAppPersistence, readBackgroundFile } from "./hooks/useAppPersistence";
import { useBibleSources } from "./hooks/useBibleSources";
import { useCardDesign } from "./hooks/useCardDesign";
import { useCardExport } from "./hooks/useCardExport";
import { usePageQueue } from "./hooks/usePageQueue";
import { hindiSourceUsesSqlite } from "./config/hindiSources";
import {
  loadLiveOutputPageId,
  subscribeLivePresent,
} from "./lib/livePresent";
import {
  defaultBackgroundSlots,
  selectedBackgroundUrl,
  type BackgroundSlots,
  type PersistedState,
} from "./lib/storage";

const SIDEBAR_ID = "app-sidebar-panel";
const EDIT_RAIL_ID = "app-edit-rail-panel";

export default function App({
  bootstrap,
  sharedStorage = false,
  onReloadShared,
}: {
  bootstrap: AppBootstrapData;
  sharedStorage?: boolean;
  onReloadShared?: () => Promise<void>;
}) {
  const persisted = bootstrap.persisted;
  const [backgrounds, setBackgrounds] = useState<BackgroundSlots>(
    () => persisted.backgrounds ?? defaultBackgroundSlots(),
  );
  const [liveOutputPageId, setLiveOutputPageId] = useState<string | null>(
    () => persisted.liveOutputPageId ?? loadLiveOutputPageId(),
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editRailOpen, setEditRailOpen] = useState(false);
  const [workflowVariant, setWorkflowVariant] = useState<ExportVariant>("live");

  const bible = useBibleSources(persisted);
  const design = useCardDesign(persisted);

  useEffect(() => {
    return subscribeLivePresent((msg) => {
      if (msg.type === "present") setLiveOutputPageId(msg.pageId);
    });
  }, []);

  const queue = usePageQueue(
    persisted.pages,
    bible.providerEn,
    bible.providerHi,
    {
      cardLayout: design.cardLayout,
      typography: design.typography,
      resolumeLayout: design.resolumeLayout,
      resolumeTypography: design.resolumeTypography,
      verseBlockOrder: design.verseBlockOrder,
    },
  );

  const cardBackgroundUrl = selectedBackgroundUrl(backgrounds);

  const persistedSnapshot = useMemo(
    (): PersistedState => ({
      pages: queue.pages,
      cardLayout: design.cardLayout,
      typography: design.typography,
      resolumeLayout: design.resolumeLayout,
      resolumeTypography: design.resolumeTypography,
      verseBlockOrder: design.verseBlockOrder,
      hindiSourceId: bible.hindiSourceId,
      englishSqliteVersionId: bible.englishVersionId,
      backgrounds,
      liveOutputPageId,
    }),
    [queue.pages, design.cardLayout, design.typography, design.resolumeLayout, design.resolumeTypography, design.verseBlockOrder, bible.hindiSourceId, bible.englishVersionId, backgrounds, liveOutputPageId],
  );

  const { sharedSaveState, bgSaveWarning, setBgSaveWarning } = useAppPersistence(
    persistedSnapshot,
    sharedStorage,
    bootstrap.remoteUpdatedAt,
  );

  const exportHostProps = useMemo(
    () => ({
      cardLayout: design.cardLayout,
      resolumeLayout: design.resolumeLayout,
      typography: design.typography,
      resolumeTypography: design.resolumeTypography,
      backgroundDataUrl: cardBackgroundUrl,
      englishLabel: bible.englishLabel,
      hindiLabel: bible.hindiLabel,
      verseBlockOrder: design.verseBlockOrder,
    }),
    [design.cardLayout, design.resolumeLayout, design.typography, design.resolumeTypography, design.verseBlockOrder, cardBackgroundUrl, bible.englishLabel, bible.hindiLabel],
  );

  const cardExport = useCardExport(exportHostProps);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  const onBgFile = (slotIndex: number, file: File | null) => {
    readBackgroundFile(
      file,
      (url) => {
        setBackgrounds((prev) => {
          const images = [...prev.images];
          images[slotIndex] = url;
          return {
            images,
            selectedIndex: url ? slotIndex : prev.selectedIndex,
          };
        });
      },
      setBgSaveWarning,
    );
  };

  const onSelectBackground = (slotIndex: number) => {
    setBackgrounds((prev) =>
      prev.images[slotIndex] ? { ...prev, selectedIndex: slotIndex } : prev,
    );
  };

  const onClearBackgroundSlot = (slotIndex: number) => {
    setBackgrounds((prev) => {
      const images = [...prev.images];
      images[slotIndex] = null;
      let selectedIndex = prev.selectedIndex;
      if (selectedIndex === slotIndex) {
        const next = images.findIndex((img) => img);
        selectedIndex = next >= 0 ? next : 0;
      }
      return { images, selectedIndex };
    });
    setBgSaveWarning(null);
  };

  return (
    <>
      <AppHeader
        sidebarOpen={sidebarOpen}
        sidebarId={SIDEBAR_ID}
        pagesCount={queue.pages.length}
        selected={queue.selected}
        sharedStorage={sharedStorage}
        sharedSaveState={sharedSaveState}
        onReloadShared={onReloadShared}
        editRailOpen={editRailOpen}
        editRailId={EDIT_RAIL_ID}
        providerEnLabel={bible.providerEn.versionLabel}
        providerHiLabel={bible.providerHi.versionLabel}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        onToggleEditRail={() => setEditRailOpen((open) => !open)}
      />

      <div className={sidebarOpen ? "app-layout app-layout--sidebar-open" : "app-layout"}>
        <DataPanelSidebar
          open={sidebarOpen}
          sidebarId={SIDEBAR_ID}
          bgSaveWarning={bgSaveWarning}
          sharedStorage={sharedStorage}
          backgrounds={backgrounds}
          bundledStatus={bible.bundledStatus}
          englishLabel={bible.englishLabel}
          hindiLabel={bible.hindiLabel}
          englishUsesYouVersion={bible.englishUsesYouVersion}
          sqliteEnActive={bible.sqliteEnActive}
          sqliteHiActive={bible.sqliteHiActive}
          enBundledLoading={bible.enBundledLoading}
          hiBundledLoading={bible.hiBundledLoading}
          englishVersionId={bible.englishVersionId}
          hindiSourceId={bible.hindiSourceId}
          sqliteFileErr={bible.sqliteFileErr}
          sqliteLoadNote={bible.sqliteLoadNote}
          onClose={() => setSidebarOpen(false)}
          onBgFile={onBgFile}
          onSelectBackground={onSelectBackground}
          onClearBackgroundSlot={onClearBackgroundSlot}
          onEnglishVersionChange={bible.setEnglishVersionId}
          onHindiSourceChange={bible.setHindiSourceId}
          onOpenSqliteUpload={bible.setSqliteUploadLang}
        />

        <div className={editRailOpen ? "app-content app-content--edit-open" : "app-content"}>
          <div className="app-content__main">
            <div className="workflow-block">
              <p className="workflow-heading">1 · Build your queue</p>

              <ReferencePicker
                providerEn={bible.providerEn}
                providerHi={bible.providerHi}
                onPreview={queue.onPreview}
              />

              {queue.draft && queue.draft.length > 0 && (
                <VerseDraftPanel
                  draft={queue.draft}
                  hindiLabel={bible.hindiLabel}
                  englishLabel={bible.englishLabel}
                  onAdd={() => void queue.addPage()}
                />
              )}

              <PageQueuePanel
                pages={queue.pages}
                selectedId={queue.selectedId}
                selected={queue.selected}
                onSelect={(id) => queue.selectPage(id, "both")}
                onRemove={queue.removePage}
                onRemoveAll={queue.removeAllPages}
                exportBusy={cardExport.exportBusy}
                onOpenExport={() => cardExport.setExportModalOpen(true)}
                onUpdateHighlights={queue.updateSelectedHighlights}
                onUpdateText={queue.updateSelectedText}
                onUpdateTitles={queue.updateSelectedTitles}
                labelEn={bible.englishLabel}
                labelHi={bible.hindiLabel}
              />
            </div>

            <div className="workflow-block">
              <p className="workflow-heading">2 · Preview</p>
              <CardPreviewSection
                pages={queue.pages}
                selectedId={queue.selectedId}
                selected={queue.selected}
                editRailOpen={editRailOpen}
                cardLayout={design.cardLayout}
                resolumeLayout={design.resolumeLayout}
                typography={design.typography}
                resolumeTypography={design.resolumeTypography}
                cardBackgroundUrl={cardBackgroundUrl}
                englishLabel={bible.englishLabel}
                hindiLabel={bible.hindiLabel}
                verseBlockOrder={design.verseBlockOrder}
                previewScale={design.previewScale}
                previewScaledSize={design.previewScaledSize}
                previewScaleResolume={design.previewScaleResolume}
                previewScaledSizeResolume={design.previewScaledSizeResolume}
                selectedLiveTypography={design.selectedLiveTypography(queue.selected)}
                selectedResolumeTypography={design.selectedResolumeTypography(queue.selected)}
                onSelectPage={queue.selectPage}
                onUpdateLiveTypography={(patch) =>
                  design.updatePageTypographyForSelected(
                    queue.selectedId,
                    patch,
                    "typographySizes",
                    queue.setPages,
                  )
                }
                onUpdateResolumeTypography={(patch) =>
                  design.updatePageTypographyForSelected(
                    queue.selectedId,
                    patch,
                    "resolumeTypographySizes",
                    queue.setPages,
                  )
                }
              />
            </div>
          </div>

          {editRailOpen && (
            <EditCardRail
              editRailId={EDIT_RAIL_ID}
              workflowVariant={workflowVariant}
              verseBlockOrder={design.verseBlockOrder}
              cardLayout={design.cardLayout}
              resolumeLayout={design.resolumeLayout}
              typography={design.typography}
              resolumeTypography={design.resolumeTypography}
              onVariantChange={setWorkflowVariant}
              onVerseBlockOrderChange={design.setVerseBlockOrder}
              onUpdateCardLayout={design.updateCardLayout}
              onUpdateTypography={design.updateTypography}
              onUpdateResolumeLayout={design.updateResolumeLayout}
              onUpdateResolumeTypography={design.updateResolumeTypography}
              onResetCardDesign={() => design.resetCardDesign(queue.setPages)}
              onResetResolumeDesign={() => design.resetResolumeDesign(queue.setPages)}
              onClose={() => setEditRailOpen(false)}
            />
          )}
        </div>
      </div>

      <SqliteUploadModal
        open={bible.sqliteUploadLang === "en"}
        languageLabel="English"
        disabled={bible.englishUsesYouVersion}
        disabledReason="Switch English to a SQLite translation before uploading a file."
        onClose={() => bible.setSqliteUploadLang(null)}
        onFile={(file) => bible.loadSqlite(file, "en")}
      />
      <SqliteUploadModal
        open={bible.sqliteUploadLang === "hi"}
        languageLabel="Hindi"
        disabled={!hindiSourceUsesSqlite(bible.hindiSourceId)}
        disabledReason="Select a SQLite Hindi translation before uploading a file."
        onClose={() => bible.setSqliteUploadLang(null)}
        onFile={(file) => bible.loadSqlite(file, "hi")}
      />

      <ExportModal
        open={cardExport.exportModalOpen}
        pages={queue.pages}
        selectedId={queue.selectedId}
        exportBusy={cardExport.exportBusy}
        onClose={() => cardExport.setExportModalOpen(false)}
        onDownloadPng={(variant, ids) => void cardExport.downloadPng(variant, queue.pages, ids)}
        onDownloadZip={(variant, ids) => void cardExport.downloadZip(variant, queue.pages, ids)}
      />
    </>
  );
}
