import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "jsdom",
  },
  resolve: {
    alias: {
      "@": import.meta.dirname,
    },
  },
});
