import { ENGLISH_SQLITE_VERSIONS, normalizeEnglishSqliteVersionId, type EnglishSqliteVersionId } from "../config/englishSqliteVersions";
import {
  HINDI_SOURCES,
  hindiSourceUsesBibleCom,
  hindiSourceUsesSqlite,
  hindiSourceUsesYouVersion,
  normalizeHindiSourceId,
  type HindiSourceId,
} from "../config/hindiSources";

type BundledStatus = "loading" | "loaded" | "partial" | "missing";

type Props = {
  open: boolean;
  sidebarId: string;
  bgSaveWarning: string | null;
  bundledStatus: BundledStatus;
  englishLabel: string;
  hindiLabel: string;
  englishUsesYouVersion: boolean;
  sqliteEnActive: boolean;
  sqliteHiActive: boolean;
  enBundledLoading: boolean;
  hiBundledLoading: boolean;
  englishVersionId: EnglishSqliteVersionId;
  hindiSourceId: HindiSourceId;
  sqliteFileErr: string | null;
  sqliteLoadNote: string | null;
  onClose: () => void;
  onBgFile: (file: File | null) => void;
  onEnglishVersionChange: (id: EnglishSqliteVersionId) => void;
  onHindiSourceChange: (id: HindiSourceId) => void;
  onOpenSqliteUpload: (lang: "en" | "hi") => void;
};

export function DataPanelSidebar({
  open,
  sidebarId,
  bgSaveWarning,
  bundledStatus,
  englishLabel,
  hindiLabel,
  englishUsesYouVersion,
  sqliteEnActive,
  sqliteHiActive,
  enBundledLoading,
  hiBundledLoading,
  englishVersionId,
  hindiSourceId,
  sqliteFileErr,
  sqliteLoadNote,
  onClose,
  onBgFile,
  onEnglishVersionChange,
  onHindiSourceChange,
  onOpenSqliteUpload,
}: Props) {
  return (
    <>
      {open && (
        <button
          type="button"
          className="app-sidebar-backdrop"
          aria-label="Close data panel"
          onClick={onClose}
        />
      )}

      <aside
        id={sidebarId}
        className={open ? "app-sidebar app-sidebar--open" : "app-sidebar"}
        aria-label="Data sources"
        aria-hidden={!open}
      >
        <div className="app-sidebar__chrome">
          <h2 className="app-sidebar__title">Data panel</h2>
          <button
            type="button"
            className="app-sidebar__close"
            aria-label="Close data panel"
            onClick={onClose}
          >
            <span aria-hidden>×</span>
          </button>
        </div>
        <div className="app-sidebar__scroll">
          <section className="panel panel--sidebar">
            <h2>Background</h2>
            <label>
              Card background image
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onBgFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {bgSaveWarning && <p className="warn">{bgSaveWarning}</p>}
            <p className="hint">
              Saved in this browser. Cards use the default color when no image is set.
            </p>
          </section>

          <section className="panel panel--sidebar">
            <h2>Bible sources</h2>
            {bundledStatus === "loading" && (
              <p className="muted">Loading bundled databases…</p>
            )}
            {(bundledStatus === "loaded" || bundledStatus === "partial") && (
              <ul className="data-source-status">
                <li>
                  English:{" "}
                  {englishUsesYouVersion ? (
                    <span>{englishLabel} (YouVersion)</span>
                  ) : sqliteEnActive ? (
                    <span>{englishLabel} ready</span>
                  ) : enBundledLoading ? (
                    <span className="muted">Loading…</span>
                  ) : (
                    <span className="muted">Not loaded</span>
                  )}
                </li>
                <li>
                  Hindi:{" "}
                  {hindiSourceUsesYouVersion(hindiSourceId) ? (
                    <span>{hindiLabel} (YouVersion)</span>
                  ) : hindiSourceUsesBibleCom(hindiSourceId) ? (
                    <span>{hindiLabel} (Bible.com)</span>
                  ) : sqliteHiActive ? (
                    <span>{hindiLabel} ready</span>
                  ) : hiBundledLoading ? (
                    <span className="muted">Loading…</span>
                  ) : (
                    <span className="muted">Not loaded</span>
                  )}
                </li>
              </ul>
            )}
            {bundledStatus === "missing" && (
              <p className="hint">
                Choose a translation below. Use <strong>Upload SQLite</strong> only if
                you need a custom database file.
              </p>
            )}
            <div className="grid2 data-source-grid">
              <div className="bible-source-column">
                <label>
                  English
                  <select
                    value={englishVersionId}
                    onChange={(e) =>
                      onEnglishVersionChange(
                        normalizeEnglishSqliteVersionId(e.target.value),
                      )
                    }
                  >
                    {ENGLISH_SQLITE_VERSIONS.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                        {v.youVersionBibleId != null ? " (YouVersion)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm bible-source-column__upload"
                  disabled={englishUsesYouVersion}
                  onClick={() => onOpenSqliteUpload("en")}
                >
                  Upload SQLite…
                </button>
              </div>
              <div className="bible-source-column">
                <label>
                  Hindi
                  <select
                    value={hindiSourceId}
                    onChange={(e) =>
                      onHindiSourceChange(normalizeHindiSourceId(e.target.value))
                    }
                  >
                    {HINDI_SOURCES.map((source) => (
                      <option key={source.id} value={source.id}>
                        {source.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm bible-source-column__upload"
                  disabled={!hindiSourceUsesSqlite(hindiSourceId)}
                  onClick={() => onOpenSqliteUpload("hi")}
                >
                  Upload SQLite…
                </button>
              </div>
            </div>
            {sqliteFileErr && <p className="error">{sqliteFileErr}</p>}
            {sqliteLoadNote && <p className="muted">{sqliteLoadNote}</p>}
          </section>
        </div>
        <div className="app-sidebar__foot">
          <button type="button" className="btn btn--ghost app-sidebar__done" onClick={onClose}>
            Done
          </button>
        </div>
      </aside>
    </>
  );
}
