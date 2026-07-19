# 墨缘 REST API 参考

Base path: `/api` (e.g. `https://<domain>/api`). All `/novels` routes require
`Authorization: Bearer <MOYUAN_API_KEY>`. Responses are JSON.

## 鉴权
- Header: `Authorization: Bearer <MOYUAN_API_KEY>`
- 未带或错误 → `401 { "error": "..." }`
- 服务端未配置 `MOYUAN_API_KEY` → `500`

## 端点

### 健康检查
`GET /health` → `{ "ok": true }`

### 小说
- `GET /novels` → `{ "novels": Novel[] }`
- `POST /novels`
  body: `{ title, author?, synopsis?, themeColor? }`
  → `201 { "novel": Novel }`（自动生成 id 与时间戳）
- `GET /novels/:id` → `NovelGraph`（不存在 → `404`）
- `PUT /novels/:id`
  body: `{ title?, author?, synopsis?, themeColor? }`
  → 更新后的 `Novel`（或 `{ ok: true }`）
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
  - 小说已存在：更新字段后对账。
  - 小说不存在：先创建再对账。
  - 对账语义：upsert 现存的 characters/relations，并删除云端多余的行。

## 数据模型（字段）

Novel: `id, title, author, synopsis, themeColor, createdAt, updatedAt`
Character: `id, novelId, name, alias?, role, faction, color, note, x, y, createdAt`
Relation: `id, novelId, sourceId, targetId, type, direction, note, createdAt`

`themeColor` ∈ ink|vermillion|gold|moss|indigo|plum
`type` ∈ kin|friend|enemy|master|lover|master-servant|sect|other
`direction` ∈ one-way|mutual

## 安全说明
API 使用 `service_role` key 直连 Supabase，绕过 RLS，可写全库。仅限应用所有者
或受信任的 Agent 使用；不要将 `MOYUAN_API_KEY` 暴露给前端或公网无鉴权场景。
