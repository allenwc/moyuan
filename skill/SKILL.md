---
name: moyuan
description: >-
  This skill should be used when an AI agent needs to create, query, or modify
  novel character-relationship graphs in 墨缘 (Moyuan) — for example adding
  novels/characters/relations, reading a novel's full graph, or bulk-syncing a
  graph state. It wraps the 墨缘 CLI, which talks to the Moyuan REST API
  (Supabase-backed). Use it whenever the user asks to operate on Moyuan novel
  data through the API or CLI rather than the browser UI.
---

# 墨缘 (Moyuan) CLI Skill

## Purpose

墨缘 is a novel character-relationship graph app. This skill lets an AI agent
operate on Moyuan data (novels, characters, relations) through the **墨剑 CLI**,
which calls the Moyuan REST API. The CLI prints JSON to stdout, making it easy
to parse and chain.

This skill lives in the repository (not in `.codebuddy`) because it is used to
**maintain the code and data**, not distributed as an end-user add-on. If it is
ever shared, it is published as an npm package (`moyuan-skill`) and installed via
`npx moyuan-skill`, which copies it into the user-level `~/.codebuddy/skills/`.

## When to use

- The user wants to inspect or edit a Moyuan novel, its characters, or relations.
- The user asks to "add a character / build a relationship graph / export the
  graph" and expects the change to persist to the cloud (Supabase).
- The user references the Moyuan API, CLI, or "skill" explicitly.

Do **not** use this skill for purely visual/UI edits that the browser app already
handles without persistence.

## Prerequisites

The CLI must be run from the **repository root** (where `package.json` and `cli/`
live). Two environment variables control the target API:

- `MOYUAN_API_URL` — base URL of the API. Default `http://localhost:3000/api`
  (local Vercel dev). For production use `https://<your-vercel-domain>/api`.
- `MOYUAN_API_KEY` — the API key (matches server `MOYUAN_API_KEY`). Required;
  requests without it return `401`.

Run commands with either:

```bash
npm run cli -- <subcommand> [options]
# or via the bundled wrapper (from anywhere inside the repo):
bash skill/scripts/moyuan.sh <subcommand> [options]
```

Dependencies must be installed (`npm install`) so that `tsx` and the workspace
package `@moyuan/core` resolve.

## Command reference

All commands output JSON to stdout. Errors go to stderr as `[<status>] <message>`.

### Novels
- `novel list` — list all novels.
- `novel create --title <t> [--author <a>] [--synopsis <s>] [--theme <color>]`
- `novel get <id>` — full graph (novel + characters + relations) for one novel.
- `novel update <id> [--title] [--author] [--synopsis] [--theme]`
- `novel delete <id>` — delete novel and its characters/relations.

### Characters
- `character add <novelId> --name <n> [--alias] [--role] [--faction] [--color] [--note] [-x 0] [-y 0]`
- `character update <novelId> <charId> [--name] [--alias] [--role] [--faction] [--color] [--note] [-x] [-y]`
- `character remove <novelId> <charId>` — deletes the character and its relations.

### Relations
- `relation add <novelId> --source <charId> --target <charId> --type <type> [--direction one-way|mutual] [--note]`
  - `--type` one of: `kin` `friend` `enemy` `master` `lover` `master-servant` `sect` `other`
- `relation update <novelId> <relId> [--source] [--target] [--type] [--direction] [--note]`
- `relation remove <novelId> <relId>`

### Graph & sync
- `graph <id>` — print the full graph JSON for a novel.
- `reconcile <id> [--file <path.json>]` — submit a complete novel state
  (`{ "novel": {...}, "characters": [...], "relations": [...] }`). When the novel
  does not yet exist it is created. Reads from `--file` or, if omitted, stdin.

## Workflow tips

1. To read the current state before editing, run `graph <id>` and parse the JSON.
2. To build a graph programmatically, assemble the full state object and pipe it
   into `reconcile <id>` via stdin or `--file`. This is the most reliable way to
   create many characters/relations at once and keep the cloud in sync.
3. For single incremental edits (e.g. add one character), prefer the dedicated
   `character add` / `relation add` subcommands.
4. Capture the returned `id` from `novel create` / `character add` / `relation add`
   to build relations that reference them.

See `references/api.md` for the full REST endpoint list and request/response shapes.

## 从微信读书导入小说（跨 skill 编排）

本节说明如何把**微信读书（weread skill）**里的一本书，创建成 Moyuan 的一条
**小说记录**。它要求当前会话同时激活 `weread-skills` 与 `moyuan` 两个 skill。
> 这是一个**编排说明**，未引入任何 CLI/API 代码改动；weread 接口名与回包字段
> 以所加载 weread skill 的参考文档（`references/search.md`、`references/book.md`）
> 为准，moyuan 命令以本文「Command reference」为准。

### 范围（重要）

- **只做**：把书的元数据（书名 / 作者 / 简介 / 主题色）创建成 Moyuan 的一条
  `novel` 记录。
- **不做**：抽取或创建 characters / relations。微信读书 skill 不暴露全书正文，
  无法据此自动构建人物关系图谱；那属于另一个独立任务。若后续要补人物与关系，
  请在 novel 记录创建完成后，另用 `character add` / `relation add` / `reconcile`。

### 前置条件

该编排要求运行环境同时具备以下条件，**缺一不可**：

| 条件 | 说明 |
|------|------|
| `WEREAD_API_KEY` | weread 鉴权 key，格式 `wrk-...`（`export WEREAD_API_KEY=...`）。 |
| `MOYUAN_API_URL` | Moyuan API 基址，见本文「Prerequisites」节。 |
| `MOYUAN_API_KEY` | Moyuan API key，见本文「Prerequisites」节。 |
| 两个 skill 同时激活 | 当前会话已加载 `weread-skills` 与 `moyuan` skill。 |

缺任一项时，**先补齐再重试**，不要静默失败：缺 `WEREAD_API_KEY` 则提示用户设置后
重新发起；缺 moyuan 环境变量则按「Prerequisites」节补齐；未加载对应 skill 则先加载。

### 网关与鉴权（weread）

weread 接口统一走 `POST https://i.weread.qq.com/api/agent/gateway`：
- Header：`Authorization: Bearer $WEREAD_API_KEY`、`Content-Type: application/json`。
- Body：JSON，`api_name` 指定接口 + 业务参数 **平铺在顶层** + 每次必带
  `skill_version`（取所加载 weread skill 顶部 `version` 字段，成文时为 `1.0.3`）。
- 若回包出现 `upgrade_info`，须先按其 `message` 升级 weread skill 再继续，不得忽略。

### 流程

#### 第 1 步：搜索拿 bookId

调 weread `/store/search`，用书名作关键词，`scope=10`（电子书）：

```bash
curl -sS -X POST "https://i.weread.qq.com/api/agent/gateway" \
  -H "Authorization: Bearer $WEREAD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"api_name":"/store/search","keyword":"<书名>","scope":10,"skill_version":"<weread skill version>"}'
```

从回包 `results[].books[].bookInfo` 取目标书：`bookInfo.bookId`（后续入参）、
`bookInfo.title`、`bookInfo.author`。搜索结果可能多条，按书名 + 作者匹配确认
目标后取其 `bookId`。

#### 第 2 步：取书籍详情

调 weread `/book/info`：

```bash
curl -sS -X POST "https://i.weread.qq.com/api/agent/gateway" \
  -H "Authorization: Bearer $WEREAD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"api_name":"/book/info","bookId":"<上一步 bookId>","skill_version":"<weread skill version>"}'
```

回包为书籍信息对象，取 `title` / `author` / `intro` / `category`。
- **字段优先级**：详情接口 `/book/info` 的回包比搜索结果更完整准确，第 3 步导入
  **以第 2 步回包为准**；第 1 步仅用于定位 `bookId`。若某字段在详情回包中缺失，
  则该字段不传给 moyuan（保留默认值），不要臆造。

#### 第 3 步：创建 Moyuan 小说记录

将取到的元数据映射到 `novel create` 参数并执行：

```bash
npm run cli -- novel create \
  --title "<title>" \
  --author "<author>" \
  --synopsis "<intro>" \
  --theme "<themeColor>"
# 或：bash skill/scripts/moyuan.sh novel create --title ... --author ... --synopsis ... --theme ...
```

成功返回 `201 { "novel": { "id": "...", ... } }`（CLI 输出 JSON 到 stdout），
记录其中 `novel.id`；后续若要补人物关系，可用 `character add <id>` /
`relation add <id>` / `reconcile <id>`。

### 字段映射

| weread 字段 | moyuan `novel create` 参数 | 必填 | 说明 |
|---|---|---|---|
| 搜索 `bookInfo.title` · 详情 `title` | `--title` | 是 | 书名 |
| 搜索 `bookInfo.author` · 详情 `author` | `--author` | 否 | 作者 |
| 搜索 `bookInfo.intro` · 详情 `intro` | `--synopsis` | 否 | 简介 |
| 搜索 `bookInfo.category` · 详情 `category` | `--theme` | 否 | 主题色，按下表派生 |

> 字段名以 weread skill 回包为准（参考 weread `references/search.md`、
> `references/book.md`）。`/book/info` 详情回包字段在顶层；若实际回包将书籍信息
> 嵌套在 `book` 对象下（如 `book.title`），则相应取 `book.<field>`，**以真实回包为准**。
> `--theme` 取值仅可为 `ink|vermillion|gold|moss|indigo|plum`（见
> `references/api.md`）。

### themeColor 派生规则

对 `/book/info` 回包的 `category` 字符串做**子串匹配**（大小写不敏感，中文按字面匹配），
命中即取对应色；多处命中时按表中顺序取首个；均不命中则回退 `ink`。

| weread `category` 命中关键词（示例） | `themeColor` | 语义 |
|---|---|---|
| 文学、小说、散文、诗歌、随笔 | `ink` | 文学基调（墨黑） |
| 历史、考古、传记、人物 | `gold` | 史册金黄 / 岁月沉淀 |
| 悬疑、推理、侦探、犯罪 | `plum` | 神秘紫梅 |
| 科幻、奇幻、武侠、玄幻 | `indigo` | 想象靛蓝 |
| 哲学、宗教、思想、心理、灵修 | `moss` | 沉静青苔 |
| 经管、商业、金融、投资、经济 | `gold` | 财富金黄 |
| 政治、军事、法律、社会、社科 | `vermillion` | 朱印史册 |
| 艺术、设计、摄影、音乐 | `plum` | 艺韵紫梅 |
| 计算机、互联网、科技、科普 | `indigo` | 科技靛蓝 |
| 其他 / 未知 / 空 | `ink` | 默认回退 |

> 上表为建议映射，agent 可据 `category` 语义做合理调整，但**所有取值必须落在**
> `ink|vermillion|gold|moss|indigo|plum` 内；无法判断时一律用 `ink`。
