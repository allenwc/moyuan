# 墨缘 (Moyuan) — 小说人物关系图谱

把小说里的人物与关系画成可拖拽、可沉淀的图谱，并对外提供 **开放 REST API + CLI + 标准 agent skill**，
让脚本与 AI Agent 也能直接读懂并改写你的故事宇宙。

数据层基于 **CloudBase PostgreSQL**。H5 前端经 CloudBase JS SDK 访问，weapp 经云函数代理访问；
对外开放的 REST API 部署为 **CloudBase HTTP 触发云函数**（`cloudfunctions/api`，Hono），用
`@cloudbase/manager-node` 执行原生 SQL；鉴权为自建会话（JWT）或用户级 API Key，
按 `user_id` 在应用层隔离。

## 架构

```
moyuan/
├── h5/                 # H5 前端（React + Vite），经 CloudBase SDK 访问
├── weapp/              # 原生微信小程序，经云函数代理访问
├── packages/core/       # 共享：领域类型 + 纯持久化逻辑（依赖注入 PgDb）
├── cloudfunctions/api/  # 对外开放 API（HTTP 触发云函数，源码在 src/，挂载 /api）
├── cli/                 # 墨缘 CLI（commander，HTTP 调 /api）
├── site/                # Astro 官网/文档（静态站）
└── skill/               # 标准 agent skill（SKILL.md + 脚本）
```

- H5 前端经 CloudBase JS SDK 直接访问；weapp 经云函数代理访问；服务端 / CLI 经开放 REST API，请求头带 `Authorization: Bearer`。
- CLI / Agent 走用户级 API Key；服务端收到后会在 `api_keys` 表中反查归属用户，再按该 `user_id` 访问小说数据。
- `packages/core` 抽离 `reconcileNovel` 等纯逻辑，前后端共用（服务端注入 `PgDb`），
  避免重写对账逻辑。
- `cloudfunctions/api/` 是**面向 CLI / Agent / 第三方**的开放接口服务，部署为 CloudBase HTTP
  触发云函数（`index.js` 解析 HTTP 事件 → `src/app.ts` 的 Hono 路由），不是 h5/weapp 的内部后端；
  路由统一挂在 `/api` 前缀。

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
npm run dev:api        # 开放 API 本地起服务（cloudfunctions/api/src，:3000，自动加载根 .env.local）
npm run cli -- novel list
```

> 开放 API 本地起一个进程（`npm run dev:api`），CLI 默认连 `http://localhost:3000/api`。

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
## 部署（开放 API — CloudBase HTTP 触发云函数）

开放 API 部署为 CloudBase 云函数（无需独立服务器，体验版可用）：

```bash
npm install
node cloudfunctions/api/build.mjs   # 打包 src/app.ts（含 @moyuan/core）→ cloudfunctions/api/app.bundle.cjs
npx tcb fn deploy api --dir cloudfunctions/api   # 部署云函数（云端自动安装依赖）

# 配置 HTTP 访问路由：/api → api 函数（路径透传，覆盖 /api/*）
npx tcb routes add --data '{"domain":"*","routes":[{"path":"/api","upstreamResourceType":"SCF","upstreamResourceName":"api","enable":true,"enablePathTransmission":true}]}'
```

> 注：`tcb fn deploy` 需确认覆盖时管道输入 `y`；云函数环境变量 `MOYUAN_JWT_SECRET`
> （微信/邮箱登录 JWT 会话用；纯 API Key 调用不需要）在控制台配置，
> `CLOUDBASE_ENV_ID` 已在 `cloudbaserc.json` 的 `functions[].envVariables` 里。

**最终访问**（HTTP 访问服务域名，无需 CloudBase 凭证）：

```
https://<envId>-<appid>.ap-shanghai.app.tcloudbase.com/api/...
# 例：https://moyuan-d5gab9aqm5759b176-1257829764.ap-shanghai.app.tcloudbase.com/api/novels
```

CLI / skill 设 `MOYUAN_API_URL=https://<envId>-<appid>.ap-shanghai.app.tcloudbase.com/api`。

> ⚠️ 不要用 `https://<envId>.api.tcloudbasegateway.com`（JS SDK 网关域名）——它要求
> CloudBase 登录态凭证，且事件格式不同，不能作为开放 API 前缀。

H5 / weapp / 官网的托管方式与本服务无关（CloudBase 静态托管 / 小程序平台 / 任意静态站均可）。

> 安全：API Key 为用户级明文凭证；CLI/Agent 持有后将以该用户身份读写其书库。
> 不要把 key 暴露给未授权来源；重新生成后旧 key 会立即失效。

## 数据模型

- `novels`：`id, title, author, synopsis, theme_color, created_at, updated_at`
- `characters`：`id, novel_id, name, alias, role, faction, color, note, x, y, created_at`
- `relations`：`id, novel_id, source_id, target_id, type, direction, note, created_at`

核心写法是**增量对账（reconcile）**：upsert 现存行并删除云端多余行，统一覆盖
增删改 / 拖拽 / 复制等场景。
