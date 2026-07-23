# 墨缘 REST API 参考

Base path: `/api` (e.g. `https://<domain>/api`). Responses are JSON.

## 鉴权（`/novels*`）

二选一：

1. **用户 JWT**：`Authorization: Bearer <moyuan_jwt>`
   - 仅能读写该用户自己的小说（服务端强制 `user_id` 校验）
2. **API Key（所有者 / Agent）**：`Authorization: Bearer <MOYUAN_API_KEY>`
   - 管理员高权限；列表可带 `?userId=` 过滤
   - 创建小说 / 新建对账时 body 需带 `userId`

未带或无效 → `401`。服务端缺配置 → `500`。

## 微信登录（无需上述鉴权）

- `POST /auth/wechat/mini` body `{ "code": "<wx.login code>" }`
  → `{ "session": { accessToken, user } }`
- `POST /auth/wechat/web` body `{ "code": "<开放平台 OAuth code>" }`
  → 同上
- `GET /auth/wechat/web/authorize-url?redirect_uri=<urlencoded>`
  → `{ "authorizeUrl": "https://open.weixin.qq.com/..." }`

前端拿到 `session` 后保存到本地存储，后续请求自动带 `Authorization: Bearer <session.accessToken>`。

## 端点

### 健康检查
`GET /health` → `{ "ok": true }`

### 小说
- `GET /novels` → `{ "novels": Novel[] }`（用户 JWT 自动隔离；API Key 可用 `?userId=`）
- `POST /novels`
  body: `{ title, author?, synopsis?, themeColor?, userId? }`
  → `201 { "novel": Novel }`
  - 用户 JWT：忽略 body.userId，使用 token 用户
  - API Key：必须提供 `userId`
- `GET /novels/:id` → `NovelGraph`（不存在或越权 → `404`）
- `PUT /novels/:id`
  body: `{ title?, author?, synopsis?, themeColor? }`
  → 更新后的 `NovelGraph`
- `DELETE /novels/:id` → `{ ok: true }`（级联删除角色与关系）

### 角色
- `POST /novels/:id/characters`
  body: `CharacterInput`（`name` 必填，`role/faction/color/note/x/y` 等）
  → `201 { "character": Character }`
- `PUT /novels/:id/characters/:cid`
  body: `Partial<CharacterInput>` → `{ ok: true }`
- `DELETE /novels/:id/characters/:cid` → `{ ok: true }`（同时删除引用它的关系）

### 关系
- `POST /novels/:id/relations`
  body: `RelationInput`（`sourceId`/`targetId`/`type` 必填）
  → `201 { "relation": Relation }`
- `PUT /novels/:id/relations/:rid`
  body: `Partial<RelationInput>` → `{ ok: true }`
- `DELETE /novels/:id/relations/:rid` → `{ ok: true }`

### 增量对账（核心）
- `POST /novels/:id/reconcile`
  body: `{ novel?: Partial<Novel>, characters?: Character[], relations?: Relation[] }`
  → 返回对账后的 `NovelGraph`。
  - 小说已存在：更新字段后对账（校验归属）。
  - 小说不存在：按路径 id 创建再对账；用户 JWT 自动带 `userId`，API Key 需 `novel.userId`。
  - 对账语义：upsert 现存的 characters/relations，并删除云端多余的行。

## 数据模型（字段）

Novel: `id, userId, title, author, synopsis, themeColor, createdAt, updatedAt`
Character: `id, novelId, name, alias?, role, faction, gender?, color, note, x, y, createdAt`
Relation: `id, novelId, sourceId, targetId, type, direction, note, createdAt`

`themeColor` ∈ ink|vermillion|gold|moss|indigo|plum
`type` ∈ kin|friend|enemy|master|lover|master-servant|sect|other
`direction` ∈ one-way|mutual

## 安全说明
- 终端用户走自建 JWT；服务端按 `user_id` 在应用层强制隔离，每个用户仅能读写自己的数据。
- `MOYUAN_API_KEY` 等同管理员权限，仅限所有者 / 受信任 Agent；勿暴露给前端。
- 微信 `appSecret` 仅存在服务端环境变量。
