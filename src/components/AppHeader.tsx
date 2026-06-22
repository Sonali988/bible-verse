import { formatReference } from "../lib/referenceParser";
import type { VersePage } from "../bible/types";

type Props = {
  sidebarOpen: boolean;
  sidebarId: string;
  pagesCount: number;
  selected: VersePage | null;
  sharedStorage: boolean;
  sharedSaveState: "idle" | "saving" | "saved" | "error";
  onReloadShared?: () => Promise<void>;
  editRailOpen: boolean;
  providerEnLabel: string;
  providerHiLabel: string;
  onToggleSidebar: () => void;
  onOpenSidebar: () => void;
  onToggleEditRail: () => void;
};

export function AppHeader({
  sidebarOpen,
  sidebarId,
  pagesCount,
  selected,
  sharedStorage,
  sharedSaveState,
  onReloadShared,
  editRailOpen,
  providerEnLabel,
  providerHiLabel,
  onToggleSidebar,
  onOpenSidebar,
  onToggleEditRail,
}: Props) {
  return (
    <header className="app-header">
      <div className="app-header__layout">
        <div className="app-header__main">
          <div className="app-header__brand">
            <button
              type="button"
              className="sidebar-toggle"
              aria-label={sidebarOpen ? "Hide data panel" : "Show data panel"}
              aria-expanded={sidebarOpen}
              aria-controls={sidebarId}
              onClick={onToggleSidebar}
            >
              <span className="sidebar-toggle__bars" aria-hidden />
            </button>
            <h1>Bible verse cards</h1>
          </div>
          <div className="app-header__meta">
            <span className="chip">
              {pagesCount} {pagesCount === 1 ? "card" : "cards"} in queue
            </span>
            {selected && (
              <span className="chip chip--accent">{formatReference(selected.ref)}</span>
            )}
            {sharedStorage && (
              <>
                <span className="chip">Shared workspace</span>
                {sharedSaveState === "saving" && <span className="chip">Saving…</span>}
                {sharedSaveState === "saved" && (
                  <span className="chip">Saved for everyone</span>
                )}
                {sharedSaveState === "error" && (
                  <span className="chip chip--warn">Save failed</span>
                )}
                {onReloadShared && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => void onReloadShared()}
                  >
                    Refresh cards
                  </button>
                )}
              </>
            )}
            <button type="button" className="btn btn--ghost btn--sm" onClick={onOpenSidebar}>
              Data &amp; background
            </button>
            <button
              type="button"
              className={editRailOpen ? "btn btn--sm" : "btn btn--ghost btn--sm"}
              aria-expanded={editRailOpen}
              onClick={onToggleEditRail}
            >
              {editRailOpen ? "Hide edit panel" : "Edit card layout"}
            </button>
            <span className="chip">
              Currently selected {providerEnLabel} + {providerHiLabel}
            </span>
          </div>
        </div>
        <div className="app-header__logo-wrap">
          <img className="app-header__logo" src="/logo.png" alt="" decoding="async" />
        </div>
      </div>
    </header>
  );
}
