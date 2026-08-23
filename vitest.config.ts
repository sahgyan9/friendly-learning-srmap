import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath } from "node:url";

// Deliberately not a merge of vite.config.ts: that file's default export is a
// function keyed on Vite's build-only ConfigEnv (isSsrBuild), which has
// nothing to do with running tests. Duplicating the one thing tests actually
// need — the "@" alias — keeps this independent of that file's shape.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    // *.eval.test.ts files hit production and spend Gemini embedding quota, so
    // they are never part of `npm test`. Run them on purpose: `npm run eval:search`.
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.eval.test.ts"],
  },
});
