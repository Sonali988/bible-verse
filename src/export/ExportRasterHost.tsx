import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import {
  mergePageTypography,
  type LayoutSpec,
  type TypographySpec,
  type VersePage,
} from "../bible/types";
import { VerseCard } from "../components/VerseCard";
import { ResolumeVerseCard } from "../components/ResolumeVerseCard";
import type { VerseBlockOrder } from "../lib/verseBlockOrder";
import type { ExportVariant } from "./exportVariant";
import type { PngLayoutSize } from "./renderPng";

export type ExportRasterProps = {
  cardLayout: LayoutSpec;
  resolumeLayout: LayoutSpec;
  typography: TypographySpec;
  resolumeTypography: TypographySpec;
  backgroundDataUrl: string | null;
  englishLabel: string;
  labelHi: string;
  verseBlockOrder: VerseBlockOrder;
};

type HostEntry = {
  root: Root;
  wrap: HTMLDivElement;
  snap: HTMLDivElement;
};

export class ExportRasterHost {
  private hosts: Partial<Record<ExportVariant, HostEntry>> = {};
  private props: ExportRasterProps | null = null;

  mount(container: HTMLElement): void {
    for (const variant of ["live", "resolume"] as const) {
      const wrap = document.createElement("div");
      wrap.className = "export-hidden-host";
      wrap.setAttribute("aria-hidden", "true");

      const snap = document.createElement("div");
      snap.className = "export-card-snapshot";
      wrap.appendChild(snap);
      container.appendChild(wrap);

      this.hosts[variant] = { root: createRoot(snap), wrap, snap };
    }
  }

  setProps(props: ExportRasterProps): void {
    this.props = props;
    for (const variant of ["live", "resolume"] as const) {
      const layout = variant === "live" ? props.cardLayout : props.resolumeLayout;
      const snap = this.hosts[variant]?.snap;
      if (!snap) continue;
      snap.style.width = `${layout.width}px`;
      snap.style.height = `${layout.height}px`;
      snap.style.boxSizing = "border-box";
      snap.style.overflow = "hidden";
    }
  }

  renderPage(page: VersePage, variant: ExportVariant): void {
    const props = this.props;
    const host = this.hosts[variant];
    if (!props || !host) {
      throw new Error("Export raster host is not ready");
    }

    flushSync(() => {
      if (variant === "live") {
        host.root.render(
          <VerseCard
            layout={props.cardLayout}
            typography={mergePageTypography(
              props.typography,
              page,
              "typographySizes",
            )}
            page={page}
            backgroundDataUrl={props.backgroundDataUrl}
            versionLabelEn={page.versionLabelEn ?? props.englishLabel}
            versionLabelHi={page.versionLabelHi ?? props.labelHi}
            verseBlockOrder={props.verseBlockOrder}
          />,
        );
      } else {
        host.root.render(
          <ResolumeVerseCard
            layout={props.resolumeLayout}
            typography={mergePageTypography(
              props.resolumeTypography,
              page,
              "resolumeTypographySizes",
            )}
            page={page}
            backgroundDataUrl={props.backgroundDataUrl}
            versionLabelEn={page.versionLabelEn ?? props.englishLabel}
            versionLabelHi={page.versionLabelHi ?? props.labelHi}
            verseBlockOrder={props.verseBlockOrder}
          />,
        );
      }
    });
  }

  getTypographyForPage(page: VersePage, variant: ExportVariant): TypographySpec {
    const props = this.props;
    if (!props) throw new Error("Export raster host props are not set");
    return variant === "live"
      ? mergePageTypography(props.typography, page, "typographySizes")
      : mergePageTypography(
          props.resolumeTypography,
          page,
          "resolumeTypographySizes",
        );
  }

  getSnapshotNode(variant: ExportVariant): HTMLDivElement {
    const host = this.hosts[variant];
    if (!host) throw new Error("Export raster host is not mounted");
    return host.snap;
  }

  getLayoutSize(variant: ExportVariant): PngLayoutSize {
    const props = this.props;
    if (!props) throw new Error("Export raster host props are not set");
    const layout = variant === "live" ? props.cardLayout : props.resolumeLayout;
    const node = this.getSnapshotNode(variant);
    const ow = Math.round(node.offsetWidth);
    const oh = Math.round(node.offsetHeight);
    return {
      width: ow > 0 ? ow : layout.width,
      height: oh > 0 ? oh : layout.height,
    };
  }

  destroy(): void {
    for (const variant of ["live", "resolume"] as const) {
      const host = this.hosts[variant];
      if (!host) continue;
      host.root.unmount();
      host.wrap.remove();
      delete this.hosts[variant];
    }
    this.props = null;
  }
}
