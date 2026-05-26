import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  assetsInclude: ["**/*.wasm"],
  server: {
    proxy: {
      "/bible-com": {
        target: "https://www.bible.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bible-com/, ""),
      },
    },
  },
});
