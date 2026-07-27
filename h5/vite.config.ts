import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@moyuan/core": path.resolve(__dirname, "../packages/core/src/index.ts"),
      "@moyuan/cloudbase": path.resolve(
        __dirname,
        "../packages/cloudbase/src/index.ts",
      ),
    },
  },
  // 读取仓库根目录 .env / .env.local（兼容 TARO_APP_CLOUDBASE_ENV_ID）
  envDir: path.resolve(__dirname, ".."),
  envPrefix: ["VITE_", "TARO_APP_"],
  server: {
    port: 5173,
    host: "localhost",
  },
});
