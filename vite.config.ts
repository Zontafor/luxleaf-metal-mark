import { defineConfig } from "vite";
import { resolve } from "node:path";
export default defineConfig({
  root: "demo",
  server: { host: "127.0.0.1" },
  build: {
    outDir: "../demo-dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        demo: resolve("demo/index.html"),
        checks: resolve("demo/checks.html"),
      },
    },
  },
});
