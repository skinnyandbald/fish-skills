import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "~": new URL("./lib", import.meta.url).pathname,
    },
  },
});
