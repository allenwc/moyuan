import { defineConfig } from "astro/config";

// 纯静态站，无需任何 adapter，可部署到任意静态托管。
export default defineConfig({
  site: "https://moyuan.app",
});
