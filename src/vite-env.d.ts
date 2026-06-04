/// <reference types="vite/client" />

declare module "sql.js/dist/sql-wasm-browser.js" {
  const initSqlJs: unknown;
  export default initSqlJs;
}

interface ImportMetaEnv {
  readonly VITE_BUNDLED_EN_SQLITE_URL?: string;
  readonly VITE_BUNDLED_HI_SQLITE_URL?: string;
  readonly VITE_BUNDLED_EN_NKJV_SQLITE_URL?: string;
  readonly VITE_BUNDLED_EN_KJV_SQLITE_URL?: string;
  readonly VITE_BUNDLED_EN_NIV_SQLITE_URL?: string;
  readonly VITE_BUNDLED_EN_NLT_SQLITE_URL?: string;
  readonly VITE_BUNDLED_EN_AMPC_SQLITE_URL?: string;
  readonly VITE_BUNDLED_EN_TPT_SQLITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.wasm?url" {
  const src: string;
  export default src;
}
