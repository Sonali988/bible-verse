# Bible verse cards (React)

Create social-style images with **parallel English (NKJV)** and **Hindi (HINOVBSI)** text on a fixed layout, optional **yellow highlights**, and export **PNG** or **ZIP**.

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## SQLite Bibles

### Bundled files (auto-load)

Place two files in **`public/bibles/`** in the project (not `src/`):

| File (default)   | Served as               | Role        |
|------------------|-------------------------|-------------|
| `nkjv.sqlite`    | `/bibles/nkjv.sqlite`   | English NKJV |
| `bsiov.sqlite`   | `/bibles/bsiov.sqlite`  | Hindi HINOVBSI |

On startup the app **fetches both URLs**. If both return **HTTP 200**, it loads them into sql.js and turns off **Use built-in sample verses** automatically.

- Rename your real `.sqlite` files to match, **or** change the default paths in [`src/config/bundledBibles.ts`](src/config/bundledBibles.ts), **or** set in `.env`:

  - `VITE_BUNDLED_EN_SQLITE_URL`
  - `VITE_BUNDLED_HI_SQLITE_URL`

After changing schema JSON, bundled files are still read with the **saved** schema from `localStorage` on first paint; use **Apply schema JSON** then refresh if you change schema before adding files.

More detail: [`public/bibles/README.txt`](public/bibles/README.txt).

### Manual load (file picker)

1. Turn off **Use built-in sample verses** if you want real lookup (unless bundled load already did).
2. Choose **NKJV** and **HINOVBSI** (Hindi) `.sqlite` files (one per language, unless your schema stores both in one file—in that case you can still use two identical uploads or extend the code).
3. If lookups fail, open **English / Hindi DB schema JSON** and adjust:

   - `verseTable` — table name with verse rows  
   - `bookColumn`, `chapterColumn`, `verseColumn`, `textColumn`  
   - `bookIsNumeric` — `true` if book is stored as `1`–`66`, `false` if text ids  
   - Optional `bookTable` + id/name columns for custom book titles  

4. Click **Apply schema JSON**, then **reload** the SQLite file so the new schema is used.

Default schema expects a table similar to:

| book_number | chapter | verse | text |
|-------------|---------|-------|------|

Your database may use `book_id`, `verse`, `t`—rename fields in the JSON to match.

## Edit card (layout & type)

The **Edit card** panel is a regular form: choose what to edit (canvas, each title/body region), then adjust:

- **Canvas** — width and height in pixels  
- **Each region** — position (`X`, `Y`) and size (`W`, `H`)  
- **Titles** — title font size and title color  
- **Bodies** — min/max font size (auto-fit uses this range), line height, text alignment, body color  
- **Fonts** — CSS `font-family` strings for English and Hindi  

Changes apply live to the preview and export. **Reset design to defaults** reloads geometry and typography from [`src/bible/types.ts`](src/bible/types.ts) (`CARD_LAYOUT` + `defaultTypography()`).

Default layout after reset: **Hindi title + verse on top**, **English title + verse below**, all in the **left half** of a 1920×1080 card; the **right half is left blank** so you can composite a camera / overlay PNG there. Verse text defaults to **white** and **bold (700)**.

**Background image** is chosen under “Background & database schema” and drawn with `background-size: cover`.

## Persistence

The **page queue**, **card layout** and **typography** (from Edit card), and **schema JSON** are saved to **localStorage** (`bvc:*` keys).

## Highlights

Select a page in the queue, then in each language box **select text** in the read-only textarea and **release the mouse** to add a highlight range. Remove ranges from the list as needed.

## Export

- **Download selected PNG** — rasterises the card at the **exact** pixel size of the current canvas (**width** × **height** from the toolbar, **1920×1080** after reset), with `pixelRatio` fixed to 1 so high-DPI screens do not double the file size.  
- **Download all as ZIP** — one PNG per queued page; may take a moment; the UI shows “Rendering…”.

## Copyright

You must have the rights to use **NKJV**, **HINOVBSI** / your Hindi text, and any SQLite databases you load. Do not commit full copyrighted databases to public repositories unless you are explicitly allowed to.

## Scripts

| Command       | Action              |
|---------------|---------------------|
| `npm run dev` | Vite dev server     |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Preview production build |
