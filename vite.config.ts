import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: { target: "es2022" }, // top-level await in main.tsx; fine for Android WebView
});
