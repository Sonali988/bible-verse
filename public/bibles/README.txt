Bundled SQLite Bibles (optional auto-load)
==========================================

Put your two database files here so the app can fetch them on startup without using the file picker:

  nkjv.sqlite   — English (NKJV)  → served as /bibles/nkjv.sqlite
  bsiov.sqlite  — Hindi (BSI Ov) → served as /bibles/bsiov.sqlite

You may rename your real files to match, or change the paths in:

  - src/config/bundledBibles.ts (defaults), or
  - .env with VITE_BUNDLED_EN_SQLITE_URL and VITE_BUNDLED_HI_SQLITE_URL

Both files must be present (HTTP 200) for auto-load to replace the sample verses.

Large or copyrighted databases are often kept out of git: add an exception only if you are allowed to commit them, or copy files here locally after clone.
