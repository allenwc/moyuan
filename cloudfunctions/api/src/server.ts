// 对外开放 API 的独立 Node 服务入口（非 Vercel serverless）。
// 部署：npm run build:api → node dist/server.js（PM2 / systemd 托管均可）。
// 本地：npm run dev:api（自动加载仓库根 .env.local）。
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import app from "./app";

// 路由统一挂在 /api 前缀下，与 CLI / skill 的 MOYUAN_API_URL=.../api 保持一致。
const root = new Hono();
root.route("/api", app);

const port = Number(process.env.PORT || 3000);
serve({ fetch: root.fetch, port }, (info) => {
  console.log(`✅ moyuan API listening on http://localhost:${info.port}/api`);
});
