/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BUNDLED_EN_SQLITE_URL?: string;
  readonly VITE_BUNDLED_HI_SQLITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.wasm?url" {
  const src: string;
  export default src;
}
