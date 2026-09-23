import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The app's "@/…" import alias (tsconfig paths), so tests can import modules that use it.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
