import { defineConfig } from "vite";
import monacoEditorPlugin from "vite-plugin-monaco-editor";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [
    solid({ ssr: false }),
    (monacoEditorPlugin as any).default({
      languageWorkers: ["editorWorkerService", "json"],
    }),
  ],
  build: {
    outDir: "../public/admin",
    emptyOutDir: true,
  },
  server: {
    port: 3001,
    proxy: {
      "/api": {
        target: "http://localhost:3333",
        changeOrigin: true,
      },
    },
  },
});
