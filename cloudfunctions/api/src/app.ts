import { Hono, type Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { getDb, type Db } from "./db";
import {
  addCharacter,
  addRelation,
  createNovel,
  deleteNovel,
  fetchAll,
  fetchGraph,
  getCharacter,
  getRelation,
  listNovels,
  reconcileNovel,
  removeCharacter,
  updateCharacter,
  updateNovel,
  updateRelation,
  ident,
  lit,
} from "@moyuan/core";
import {
  loginMiniWithCode,
  loginWebWithCode,
  buildWebAuthorizeUrl,
} from "./wechatAuth";
import { issueDevBypassSession } from "./devAuth";
import { loginWithEmailPassword } from "./emailAuth";
import type {
  CharacterInput,
  NovelInput,
  RelationInput,
} from "@moyuan/core";
import { verifyJwt } from "./authJwt";

interface AuthContext {
  mode: "api_key" | "user";
  userId: string | null;
}

async function resolveAuth(c: Context, db: Db): Promise<AuthContext> {
  const auth = c.req.header("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token) {
    const keyRows = await db.query<{ user_id: unknown }>(
      `SELECT user_id FROM api_keys WHERE api_key = ${lit(token)} LIMIT 1`,
    );
    if (keyRows.length > 0) {
      return { mode: "api_key", userId: String(keyRows[0].user_id) };
    }
  }
  if (token) {
    const payload = verifyJwt(token);
    if (payload?.sub) return { mode: "user", userId: payload.sub };
  }
  throw new HTTPException(401, { message: "未授权：缺少有效令牌" });
}

function scopeUserId(auth: AuthContext, c: Context): string | null {
  if (auth.userId) return auth.userId;
  if (auth.mode === "user") return auth.userId;
  return new URL(c.req.url).searchParams.get("userId");
}

function requireWriteUserId(auth: AuthContext): string {
  const uid = auth.userId;
  if (!uid) throw new HTTPException(401, { message: "未授权" });
  return uid;
}

async function lookupNovelOwner(db: Db, novelId: string): Promise<string | null> {
  const rows = await db.query<{ user_id: unknown }>(
    `SELECT user_id FROM novels WHERE id = ${lit(novelId)} LIMIT 1`,
  );
  return rows.length > 0 ? String(rows[0].user_id) : null;
}

async function assertNovelAccess(
  db: Db,
  auth: AuthContext,
  novelId: string,
): Promise<void> {
  const ownerId = await lookupNovelOwner(db, novelId);
  if (!ownerId || ownerId !== auth.userId) {
    throw new HTTPException(404, { message: "小说不存在或无权访问" });
  }
}

const app = new Hono();

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error("[api] 未处理异常:", err);
  return c.json({ error: "服务器内部错误" }, 500);
});

// 健康检查（部署探活）：GET /api/health
app.get("/health", (c) =>
  c.json({ ok: true, service: "moyuan-api", ts: Date.now() }),
);

// ---------- 数据：小说 ----------

app.get("/novels", async (c) => {
  const db = getDb();
  const auth = await resolveAuth(c, db);
  const userId = scopeUserId(auth, c);
  if (auth.mode === "user" && !userId)
    throw new HTTPException(401, { message: "用户身份缺失" });
  const novels = await listNovels(db, { userId });
  return c.json({ novels });
});

// 全量快照（前端首屏拉取）
app.get("/novels/snapshot", async (c) => {
  const db = getDb();
  const auth = await resolveAuth(c, db);
  const userId = scopeUserId(auth, c);
  if (auth.mode === "user" && !userId)
    throw new HTTPException(401, { message: "用户身份缺失" });
  const snap = await fetchAll(db, { userId });
  return c.json(snap);
});

app.post("/novels", async (c) => {
  const db = getDb();
  const auth = await resolveAuth(c, db);
  const userId = requireWriteUserId(auth);
  const body = (await c.req.json()) as Partial<NovelInput>;
  const novel = await createNovel(
    db,
    {
      title: body.title ?? "",
      author: body.author,
      synopsis: body.synopsis,
      cover: body.cover,
      themeColor: body.themeColor,
    },
    { userId },
  );
  return c.json({ novel }, 201);
});

app.get("/novels/:id", async (c) => {
  const db = getDb();
  const auth = await resolveAuth(c, db);
  const novelId = c.req.param("id");
  await assertNovelAccess(db, auth, novelId);
  const graph = await fetchGraph(db, novelId);
  if (!graph) throw new HTTPException(404, { message: "小说不存在" });
  return c.json(graph);
});

app.put("/novels/:id", async (c) => {
  const db = getDb();
  const auth = await resolveAuth(c, db);
  const novelId = c.req.param("id");
  await assertNovelAccess(db, auth, novelId);
  const body = (await c.req.json()) as Partial<NovelInput>;
  await updateNovel(db, novelId, body);
  const graph = await fetchGraph(db, novelId);
  return c.json(graph);
});

app.delete("/novels/:id", async (c) => {
  const db = getDb();
  const auth = await resolveAuth(c, db);
  const novelId = c.req.param("id");
  await assertNovelAccess(db, auth, novelId);
  await deleteNovel(db, novelId);
  return c.body(null, 204);
});

app.post("/novels/:id/reconcile", async (c) => {
  const db = getDb();
  const auth = await resolveAuth(c, db);
  const novelId = c.req.param("id");
  const ownerId = await lookupNovelOwner(db, novelId);
  if (ownerId && ownerId !== auth.userId) {
    throw new HTTPException(404, { message: "小说不存在或无权访问" });
  }
  const body = (await c.req.json()) as {
    novel?: import("@moyuan/core").Novel;
    characters?: import("@moyuan/core").Character[];
    relations?: import("@moyuan/core").Relation[];
  };
  if (!body.novel) throw new HTTPException(400, { message: "缺少 novel" });
  body.novel.userId = requireWriteUserId(auth);
  body.novel.id = novelId;
  const graph = await reconcileNovel(
    db,
    body.novel,
    body.characters ?? [],
    body.relations ?? [],
  );
  return c.json(graph);
});

// ---------- 数据：角色 ----------

app.post("/novels/:id/characters", async (c) => {
  const db = getDb();
  const auth = await resolveAuth(c, db);
  const novelId = c.req.param("id");
  await assertNovelAccess(db, auth, novelId);
  const body = (await c.req.json()) as CharacterInput;
  const character = await addCharacter(db, novelId, body);
  return c.json({ character }, 201);
});

app.put("/novels/:id/characters/:charId", async (c) => {
  const db = getDb();
  const auth = await resolveAuth(c, db);
  const novelId = c.req.param("id");
  const charId = c.req.param("charId");
  await assertNovelAccess(db, auth, novelId);
  const body = (await c.req.json()) as Partial<CharacterInput>;
  await updateCharacter(db, charId, body);
  const character = await getCharacter(db, charId);
  return c.json({ character });
});

app.delete("/novels/:id/characters/:charId", async (c) => {
  const db = getDb();
  const auth = await resolveAuth(c, db);
  const novelId = c.req.param("id");
  const charId = c.req.param("charId");
  await assertNovelAccess(db, auth, novelId);
  await removeCharacter(db, novelId, charId);
  return c.json({ characters: [], relations: [] });
});

// ---------- 数据：关系 ----------

app.post("/novels/:id/relations", async (c) => {
  const db = getDb();
  const auth = await resolveAuth(c, db);
  const novelId = c.req.param("id");
  await assertNovelAccess(db, auth, novelId);
  const body = (await c.req.json()) as RelationInput;
  const relation = await addRelation(db, novelId, body);
  return c.json({ relation }, 201);
});

app.put("/novels/:id/relations/:relId", async (c) => {
  const db = getDb();
  const auth = await resolveAuth(c, db);
  const novelId = c.req.param("id");
  const relId = c.req.param("relId");
  await assertNovelAccess(db, auth, novelId);
  const body = (await c.req.json()) as Partial<RelationInput>;
  await updateRelation(db, relId, body);
  const relation = await getRelation(db, relId);
  return c.json({ relation });
});

app.delete("/novels/:id/relations/:relId", async (c) => {
  const db = getDb();
  const auth = await resolveAuth(c, db);
  const novelId = c.req.param("id");
  const relId = c.req.param("relId");
  await assertNovelAccess(db, auth, novelId);
  await db.query(
    `DELETE FROM ${ident("relations")} WHERE ${ident("id")} = ${lit(relId)}`,
  );
  return c.json({ relations: [] });
});

// ---------- 鉴权 ----------

app.get("/auth/wechat/web/authorize-url", async (c) => {
  const redirectUri = c.req.query("redirect_uri") || "";
  if (!redirectUri) return c.json({ error: "缺少 redirect_uri" }, 400);
  const url = buildWebAuthorizeUrl(redirectUri);
  return c.json({ authorizeUrl: url });
});

app.post("/auth/wechat/mini", async (c) => {
  const { code } = (await c.req.json()) as { code?: string };
  if (!code) return c.json({ error: "缺少 code" }, 400);
  const session = await loginMiniWithCode(getDb(), code);
  return c.json({ session });
});

app.post("/auth/wechat/web", async (c) => {
  const { code } = (await c.req.json()) as { code?: string };
  if (!code) return c.json({ error: "缺少 code" }, 400);
  const session = await loginWebWithCode(getDb(), code);
  return c.json({ session });
});

app.post("/auth/dev-login", async (c) => {
  const session = await issueDevBypassSession(getDb());
  return c.json({ session });
});

app.post("/auth/login", async (c) => {
  const { email, password } = (await c.req.json()) as {
    email?: string;
    password?: string;
  };
  if (!email || !password)
    return c.json({ error: "缺少邮箱或密码" }, 400);
  const session = await loginWithEmailPassword(getDb(), email, password);
  return c.json({ session });
});

export default app;
