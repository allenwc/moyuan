# 墨缘 (Moyuan) — 小说人物关系图谱

把小说里的人物与关系画成可拖拽、可沉淀的图谱，并对外提供 **REST API + CLI + 标准 agent skill**，
让脚本与 AI Agent 也能直接读懂并改写你的故事宇宙。

数据层基于 **Supabase**（Postgres + RLS）。前端用 anon key 直连；服务端 API 用
`service_role` 直连，绕过 RLS 做全量 CRUD，并受 `MOYUAN_API_KEY` 鉴权。

## 架构

```
moyuan/
├── src/                 # 前端（React + Vite），anon key 直连 Supabase
├── packages/core/       # 共享：领域类型 + 纯持久化逻辑（依赖注入 Supabase client）
├── api/                 # Hono 写的 Vercel Serverless Function → /api
├── cli/                 # 墨缘 CLI（commander，HTTP 调 /api）
├── site/                # Astro 官网/文档（独立 Vercel 项目）
└── .codebuddy/skills/moyuan/   # 标准 agent skill（SKILL.md + 脚本）
```

- 浏览器前端：`src/lib/supabase.ts` 用 anon key，受 RLS 约束。
- `packages/core` 抽离 `reconcileNovel` 等纯逻辑，浏览器端（anon）与服务端（service_role）
  共用同一份代码，避免重写对账逻辑。
- `api/` 作为 Vercel Serverless Function 部署在 `/api`，与前端**同项目同域**。

## 本地开发

```bash
npm install            # 安装根 + 所有 workspace 依赖
npm run dev            # 启动前端（vite）
vercel dev             # 本地同时跑前端 + /api 函数（需全局装 vercel）
npm run cli -- novel list   # 用 CLI 调本地 API（需先设置下面环境变量）
```

CLI / 本地调用所需环境变量（参见 `.env.example`）：

```bash
export MOYUAN_API_URL="http://localhost:3000/api"
export MOYUAN_API_KEY="<与服务端一致的 key>"
```

## CLI 速查

```bash
moyuan novel list
moyuan novel create --title "红楼梦" --author "曹雪芹"
moyuan novel get <id>
moyuan character add <novelId> --name 贾宝玉 --role 公子 --faction 荣国府
moyuan relation add <novelId> --source <id> --target <id> --type kin
moyuan graph <id>
moyuan reconcile <id> --file graph.json   # 批量对账整图
```

所有命令向 stdout 输出 JSON，便于脚本 / Agent 管道处理。

## Agent skill

`.codebuddy/skills/moyuan/` 是符合规范的 agent skill，AI 客户端加载后即可在对话中直接
操作墨缘数据。详见该目录的 `SKILL.md` 与 `references/api.md`。

## 部署（Vercel）

需要 **两个 Vercel 项目**（同一仓库，不同根目录）：

1. **应用项目**（Root = 仓库根）：`vite build` 产出 `dist/`（前端），`api/` 自动作为
   Serverless Function 部署到 `/api`。在 Vercel 项目设置里添加服务端环境变量：
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`（**仅服务端，绝不进 VITE_**）
   - `MOYUAN_API_KEY`

2. **官网项目**（Root = `site/`）：Astro 静态站，独立域名（如 `moyuan.app`）。

> 安全：API 使用 `service_role` 可写全库，必须配合 `MOYUAN_API_KEY` 鉴权；
> 不要把 key 写进前端或暴露给未授权来源。

## 数据模型

- `novels`：`id, title, author, synopsis, theme_color, created_at, updated_at`
- `characters`：`id, novel_id, name, alias, role, faction, color, note, x, y, created_at`
- `relations`：`id, novel_id, source_id, target_id, type, direction, note, created_at`

核心写法是**增量对账（reconcile）**：upsert 现存行并删除云端多余行，统一覆盖
增删改 / 拖拽 / 复制等场景。
