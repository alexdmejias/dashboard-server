import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid({ ssr: false })],
  build: {
    outDir: "../public/admin",
    emptyOutDir: true,
  },
  server: {
    port: 3001,
  },
});
