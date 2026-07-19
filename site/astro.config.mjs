import { defineConfig } from "astro/config";

// 纯静态站，部署到 Vercel 时无需 adapter（Vercel 会自动识别 Astro 并静态构建）。
export default defineConfig({
  site: "https://moyuan.app",
});
