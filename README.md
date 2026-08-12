# 墨缘 (Moyuan) — 小说人物关系图谱

把小说里的人物与关系画成可拖拽、可沉淀的图谱，并对外提供 **开放 REST API + CLI + 标准 agent skill**，
让脚本与 AI Agent 也能直接读懂并改写你的故事宇宙。

数据层基于 **CloudBase PostgreSQL**。H5 前端经 CloudBase JS SDK 访问，weapp 经云函数代理访问；
对外开放的 REST API 是**独立部署的 Node 服务**（Hono + `@hono/node-server`），用
`@cloudbase/manager-node` 执行原生 SQL；鉴权为自建会话（JWT）或用户级 API Key，
按 `user_id` 在应用层隔离。

## 架构

```
moyuan/
├── h5/                 # H5 前端（React + Vite），经 CloudBase SDK 访问
├── weapp/              # 原生微信小程序，经云函数代理访问
├── packages/core/       # 共享：领域类型 + 纯持久化逻辑（依赖注入 PgDb）
├── api/                 # 对外开放 API（独立 Node 服务，Hono，挂载 /api）
├── cli/                 # 墨缘 CLI（commander，HTTP 调 /api）
├── site/                # Astro 官网/文档（静态站）
└── skill/               # 标准 agent skill（SKILL.md + 脚本）
```

- H5 前端经 CloudBase JS SDK 直接访问；weapp 经云函数代理访问；服务端 / CLI 经开放 REST API，请求头带 `Authorization: Bearer`。
- CLI / Agent 走用户级 API Key；服务端收到后会在 `api_keys` 表中反查归属用户，再按该 `user_id` 访问小说数据。
- `packages/core` 抽离 `reconcileNovel` 等纯逻辑，前后端共用（服务端注入 `PgDb`），
  避免重写对账逻辑。
- `api/` 是**面向 CLI / Agent / 第三方**的开放接口服务，独立 Node 进程部署（`@hono/node-server`），
  不是 h5/weapp 的内部后端；路由统一挂在 `/api` 前缀。

## 本地开发

在仓库根目录创建 `.env.local`（可参考 `.env.example`），至少配置：

```bash
CLOUDBASE_ENV_ID=your-env-id
CLOUDBASE_SECRET_ID=your-secret-id
CLOUDBASE_SECRET_KEY=your-secret-key
MOYUAN_JWT_SECRET=change-me-strong-secret
```

前端构建变量以 `VITE_` 前缀注入；改完后需重启 dev。

```bash
npm install
npm run dev:h5         # H5
npm run dev:weapp      # 微信小程序（产物在 dist/weapp，用开发者工具打开仓库根）
npm run dev:api        # 开放 API（独立 Node 服务，:3000，自动加载仓库根 .env.local）
npm run cli -- novel list
```

> 开放 API 独立起一个进程（`npm run dev:api`），CLI 默认连 `http://localhost:3000/api`。

CLI / 本地调用所需环境变量（`MOYUAN_API_KEY` 为用户在个人中心生成的那把 key）：

```bash
export MOYUAN_API_URL="http://localhost:3000/api"
export MOYUAN_API_KEY="<个人中心里复制的 API Key>"
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

`skill/` 是符合规范的 agent skill（SKILL.md + `scripts/moyuan.sh` 包装 CLI），AI 客户端加载后即可在
对话中直接操作墨缘数据。

当前环境的安装方式（pi）：

```bash
ln -sfn /path/to/moyuan-weapp/skill ~/.pi/agent/skills/moyuan
```

也可用 `skill/install.mjs`（`npx moyuan-skill`）安装到 CodeBuddy。详见 `skill/SKILL.md` 与 `skill/references/api.md`。
## 部署（开放 API 独立服务）

`api/` 是独立 Node 服务，不依赖任何 Serverless 平台：

```bash
npm install
npm run build:api        # esbuild 打包 → api/dist/server.js（含 @moyuan/core，npm 依赖保持 external）
node api/dist/server.js  # 或 npm run start:api
```

健康检查：`GET /api/health`。

**环境变量**（**绝不进前端包**）：

```bash
CLOUDBASE_ENV_ID=your-env-id
CLOUDBASE_SECRET_ID=your-secret-id
CLOUDBASE_SECRET_KEY=your-secret-key
MOYUAN_JWT_SECRET=change-me-strong-secret
WECHAT_APPID=your-wechat-appid      # 可选，微信登录需要时配
WECHAT_SECRET=your-wechat-secret
PORT=3000                            # 可选，默认 3000
```

**进程托管**（二选一）：

```bash
# PM2
pm2 start api/dist/server.js --name moyuan-api

# systemd（/etc/systemd/system/moyuan-api.service）
# [Service] ExecStart=/usr/bin/node /opt/moyuan/api/dist/server.js
# EnvironmentFile=/opt/moyuan/.env.production
```

H5 / weapp / 官网的托管方式与本服务无关（CloudBase 静态托管 / 小程序平台 / 任意静态站均可）。

> 安全：API Key 为用户级明文凭证；CLI/Agent 持有后将以该用户身份读写其书库。
> 不要把 key 暴露给未授权来源；重新生成后旧 key 会立即失效。

## 数据模型

- `novels`：`id, title, author, synopsis, theme_color, created_at, updated_at`
- `characters`：`id, novel_id, name, alias, role, faction, color, note, x, y, created_at`
- `relations`：`id, novel_id, source_id, target_id, type, direction, note, created_at`

核心写法是**增量对账（reconcile）**：upsert 现存行并删除云端多余行，统一覆盖
增删改 / 拖拽 / 复制等场景。
