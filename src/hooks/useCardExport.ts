import { useCallback, useEffect, useRef, useState } from "react";
import type { VersePage } from "../bible/types";
import { capturePngBlob, prepareExportBatch } from "../export/batchExport";
import { savePng, zipBlobs } from "../export/downloadZip";
import { ExportRasterHost } from "../export/ExportRasterHost";
import {
  createExportProgressTracker,
  type ExportFormat,
} from "../export/exportProgress";
import { exportProgressStore } from "../export/exportProgressStore";
import type { ExportVariant } from "../export/exportVariant";
import { datedZipFileName, uniqueExportPngFileNames } from "../lib/exportFileNames";
import { formatReference } from "../lib/referenceParser";
import type { VerseBlockOrder } from "../lib/verseBlockOrder";
import type { LayoutSpec, TypographySpec } from "../bible/types";

type ExportHostProps = {
  cardLayout: LayoutSpec;
  resolumeLayout: LayoutSpec;
  typography: TypographySpec;
  resolumeTypography: TypographySpec;
  backgroundDataUrl: string | null;
  englishLabel: string;
  hindiLabel: string;
  verseBlockOrder: VerseBlockOrder;
};

export function useCardExport(hostProps: ExportHostProps) {
  const [exportBusy, setExportBusy] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const exportHostRef = useRef<ExportRasterHost | null>(null);

  useEffect(() => {
    const host = new ExportRasterHost();
    host.mount(document.body);
    exportHostRef.current = host;
    return () => {
      host.destroy();
      exportHostRef.current = null;
    };
  }, []);

  useEffect(() => {
    exportHostRef.current?.setProps({
      cardLayout: hostProps.cardLayout,
      resolumeLayout: hostProps.resolumeLayout,
      typography: hostProps.typography,
      resolumeTypography: hostProps.resolumeTypography,
      backgroundDataUrl: hostProps.backgroundDataUrl,
      englishLabel: hostProps.englishLabel,
      labelHi: hostProps.hindiLabel,
      verseBlockOrder: hostProps.verseBlockOrder,
    });
  }, [hostProps]);

  const clearExportProgressSoon = useCallback(() => {
    window.setTimeout(() => exportProgressStore.setImmediate(null), 5000);
  }, []);

  const runExportBatch = useCallback(
    async (
      variant: ExportVariant,
      list: VersePage[],
      format: ExportFormat,
      onBlob: (page: VersePage, blob: Blob, index: number) => void | Promise<void>,
    ) => {
      const host = exportHostRef.current;
      if (!host) throw new Error("Export host missing");
      const tracker = createExportProgressTracker(list.length, format, variant);
      setExportBusy(true);
      exportProgressStore.setImmediate(tracker.preparing());
      let completed = 0;
      try {
        const layoutSize = await prepareExportBatch(host, variant, list[0]!);
        for (let i = 0; i < list.length; i++) {
          const p = list[i]!;
          exportProgressStore.set(tracker.rendering(i, formatReference(p.ref)));
          const t0 = performance.now();
          const blob = await capturePngBlob(host, p, variant, layoutSize);
          tracker.recordRender(performance.now() - t0);
          await onBlob(p, blob, i);
          completed = i + 1;
        }
        return tracker;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        exportProgressStore.setImmediate(tracker.error(message, completed));
        setExportBusy(false);
        clearExportProgressSoon();
        throw e;
      }
    },
    [clearExportProgressSoon],
  );

  const downloadPng = useCallback(
    async (variant: ExportVariant, pages: VersePage[], pageIds: string[]) => {
      const list = pages.filter((p) => pageIds.includes(p.id));
      if (list.length === 0) return;
      try {
        const names = uniqueExportPngFileNames(
          list,
          variant,
          hostProps.englishLabel,
          hostProps.hindiLabel,
          hostProps.verseBlockOrder,
        );
        const tracker = await runExportBatch(variant, list, "png", (p, blob, i) => {
          savePng(blob, names[i]!);
        });
        exportProgressStore.setImmediate(tracker.complete());
      } finally {
        setExportBusy(false);
        clearExportProgressSoon();
      }
    },
    [
      clearExportProgressSoon,
      runExportBatch,
      hostProps.englishLabel,
      hostProps.hindiLabel,
      hostProps.verseBlockOrder,
    ],
  );

  const downloadZip = useCallback(
    async (variant: ExportVariant, pages: VersePage[], pageIds: string[]) => {
      const list = pages.filter((p) => pageIds.includes(p.id));
      if (list.length === 0) return;
      const entries: { name: string; blob: Blob }[] = [];
      try {
        const names = uniqueExportPngFileNames(
          list,
          variant,
          hostProps.englishLabel,
          hostProps.hindiLabel,
          hostProps.verseBlockOrder,
          false,
        );
        const tracker = await runExportBatch(variant, list, "zip", (p, blob, i) => {
          entries.push({
            name: names[i]!,
            blob,
          });
        });
        exportProgressStore.setImmediate(tracker.zipping());
        await zipBlobs(entries, datedZipFileName(variant));
        exportProgressStore.setImmediate(tracker.complete());
      } finally {
        setExportBusy(false);
        clearExportProgressSoon();
      }
    },
    [clearExportProgressSoon, runExportBatch, hostProps.englishLabel, hostProps.hindiLabel, hostProps.verseBlockOrder],
  );

  return {
    exportBusy,
    exportModalOpen,
    setExportModalOpen,
    downloadPng,
    downloadZip,
  };
}
