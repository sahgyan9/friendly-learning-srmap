import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath } from "node:url";

/**
 * Config for the relevance evals only.
 *
 * The base config excludes *.eval.test.ts so `npm test` never hits production
 * or spends Gemini embedding quota. This one runs exactly those files.
 *
 * Standalone rather than a mergeConfig of vitest.config.ts: both --exclude and
 * mergeConfig *append* to the configured exclude list rather than replacing
 * it, so either route leaves the eval files excluded from their own run.
 *
 *   npm run eval:search
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // No jsdom and no setup file — these talk to the network, not the DOM.
    environment: "node",
    globals: true,
    css: false,
    include: ["**/*.eval.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    // The per-query table is the point of running this, so it has to print on
    // a pass too — Vitest otherwise only surfaces console output for failures.
    disableConsoleIntercept: true,
  },
});
