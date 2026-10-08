import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// JSX uses the automatic runtime from tsconfig ("jsx": "react-jsx"), which Vite reads directly.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
  },
});
