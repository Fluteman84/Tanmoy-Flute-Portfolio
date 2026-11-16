import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const entries = {
  portfolio: "index.html",
  palta: "notes.html",
  notation: "notation.html",
  tabla: "tabla.html",
  zitar: "zitar.html",
  tablaStandalone: "tabla-taal-engine/index.html",
};

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        Object.entries(entries).map(([name, path]) => [name, fileURLToPath(new URL(path, import.meta.url))]),
      ),
    },
  },
});
