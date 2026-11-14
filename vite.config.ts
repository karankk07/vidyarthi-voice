import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// "demo" mode builds one self-contained HTML file with sample data (no backend).
export default defineConfig(({ mode }) => ({
  plugins: mode === "demo" ? [react(), viteSingleFile()] : [react()],
  base: "./",
  build: { outDir: mode === "demo" ? "dist-demo" : "dist" },
}));
