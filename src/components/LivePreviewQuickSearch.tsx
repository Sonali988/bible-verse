import { useEffect, useState } from "react";
import type { VerseSearchHit } from "../bible/provider";
import type { VerseRef } from "../bible/types";
import type { EnglishSqliteVersionId } from "../config/englishSqliteVersions";
import type { HindiSourceId } from "../config/hindiSources";
import { useBibleSources } from "../hooks/useBibleSources";
import { addVerseToLivePreview } from "../lib/liveAddVerse";
import { looksLikeReferenceQuery } from "../lib/parseReferenceQuery";
import { formatReference } from "../lib/referenceParser";
import { searchVersesByQuery } from "../lib/searchVersesByQuery";
import {
  loadPersisted,
  loadPersistedRemote,
  remoteStorageEnabled,
} from "../lib/storage";

const MAX_RESULTS = 12;
const SNIPPET_LEN = 100;

type Props = {
  onAdded: (pageId: string) => void;
};

type SourceIds = {
  hindiSourceId?: HindiSourceId;
  englishSqliteVersionId?: EnglishSqliteVersionId;
};

function refKey(ref: VerseRef): string {
  return `${ref.bookId}:${ref.chapter}:${ref.verse}`;
}

function snippet(text: string, query: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const q = query.trim().toLowerCase();
  const idx = q ? trimmed.toLowerCase().indexOf(q) : 0;
  if (idx < 0 || trimmed.length <= SNIPPET_LEN) return trimmed;
  const start = Math.max(0, idx - 16);
  const end = Math.min(trimmed.length, start + SNIPPET_LEN);
  return `${start > 0 ? "…" : ""}${trimmed.slice(start, end)}${end < trimmed.length ? "…" : ""}`;
}

export function LivePreviewQuickSearch({ onAdded }: Props) {
  const [sourceIds, setSourceIds] = useState<SourceIds>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (remoteStorageEnabled()) {
        try {
          const { state } = await loadPersistedRemote();
          if (!cancelled) {
            setSourceIds({
              hindiSourceId: state.hindiSourceId,
              englishSqliteVersionId: state.englishSqliteVersionId,
            });
          }
          return;
        } catch {
          /* fall through */
        }
      }
      const local = loadPersisted();
      if (!cancelled) {
        setSourceIds({
          hindiSourceId: local.hindiSourceId,
          englishSqliteVersionId: local.englishSqliteVersionId,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const bible = useBibleSources(sourceIds);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<VerseSearchHit[] | null>(null);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const textSearchAvailable =
    bible.providerEn.isReady() &&
    typeof bible.providerEn.searchEnglish === "function";
  const canSearch =
    bible.providerEn.isReady() &&
    (textSearchAvailable || looksLikeReferenceQuery(query));

  const runSearch = async () => {
    setError(null);
    const q = query.trim();
    if (!q) {
      setHits([]);
      setOpen(true);
      return;
    }
    setSearching(true);
    try {
      const { hits: results } = await searchVersesByQuery(
        bible.providerEn,
        q,
        MAX_RESULTS,
      );
      setHits(results);
      setOpen(true);
    } catch (e) {
      setHits([]);
      setError(e instanceof Error ? e.message : String(e));
      setOpen(true);
    } finally {
      setSearching(false);
    }
  };

  const addHit = async (hit: VerseSearchHit) => {
    const key = refKey(hit.ref);
    setError(null);
    setAddingKey(key);
    try {
      if (!bible.providerHi.isReady()) {
        throw new Error("Hindi source not ready.");
      }
      const textHi = await bible.providerHi.getPassage(hit.ref);
      const pageId = await addVerseToLivePreview(
        { ref: hit.ref, textEn: hit.textEn, textHi },
        bible.providerEn,
        bible.providerHi,
      );
      setQuery("");
      setHits(null);
      setOpen(false);
      onAdded(pageId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAddingKey(null);
    }
  };

  return (
    <div className="live-preview-quick-search">
      <form
        className="live-preview-quick-search__form"
        onSubmit={(e) => {
          e.preventDefault();
          void runSearch();
        }}
      >
        <input
          type="search"
          className="live-preview-quick-search__input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (hits) setOpen(true);
          }}
          placeholder="hope… or Jn 3:16"
          disabled={!bible.providerEn.isReady() || searching}
          autoComplete="off"
          aria-label="Quick search verses"
        />
        <button
          type="submit"
          className="btn btn--sm"
          disabled={!canSearch || searching || !query.trim()}
        >
          {searching ? "…" : "Search"}
        </button>
      </form>
      {error && <p className="live-preview-quick-search__error">{error}</p>}
      {open && hits && (
        <div className="live-preview-quick-search__dropdown" role="listbox">
          {hits.length === 0 ? (
            <p className="muted live-preview-quick-search__empty">No matches</p>
          ) : (
            <ul className="live-preview-quick-search__list">
              {hits.map((hit) => {
                const key = refKey(hit.ref);
                const busy = addingKey === key;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      className="live-preview-quick-search__hit"
                      disabled={busy || !bible.providerHi.isReady()}
                      onClick={() => void addHit(hit)}
                    >
                      <span className="live-preview-quick-search__ref">
                        {formatReference(hit.ref)}
                      </span>
                      <span className="live-preview-quick-search__snip">
                        {busy ? "Adding…" : snippet(hit.textEn, query)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
