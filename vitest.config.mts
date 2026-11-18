import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Resolve the `@/` import alias from tsconfig.json, so tests can import app modules.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
});
