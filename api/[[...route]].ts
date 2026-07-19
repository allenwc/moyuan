import { Hono } from "hono";
import { cors } from "hono/cors";
import { handle } from "hono/vercel";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  listNovels,
  fetchGraph,
  createNovel,
  updateNovel,
  deleteNovel,
  addCharacter,
  updateCharacter,
  removeCharacter,
  addRelation,
  updateRelation,
  removeRelation,
  reconcileNovel,
  type Character,
  type CharacterInput,
  type Novel,
  type NovelInput,
  type Relation,
  type RelationInput,
  type ThemeColor,
} from "@moyuan/core";

/** 小说可更新字段（themeColor 需为合法枚举值） */
type NovelPatch = {
  title?: string;
  author?: string;
  synopsis?: string;
  themeColor?: ThemeColor;
};

/**
 * 墨缘对外 REST API —— 作为 Vercel Serverless Function 部署在 /api 下。
 *
 * - 使用 service_role key 直连 Supabase，绕过 RLS，做全量 CRUD（仅服务端可见）。
 * - 所有 /novels 路由都需要 Bearer MOYUAN_API_KEY 鉴权。
 * - 仅适合应用所有者本人 / 受信任的 Agent 调用（service_role 可写全库）。
 */

const app = new Hono().basePath("/api");

// 允许跨域，便于 CLI 与 AI Agent 从任意来源调用（接口本身受 key 保护）。
app.use(
  "/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

// 鉴权中间件
app.use("/novels/*", async (c, next) => {
  const expected = process.env.MOYUAN_API_KEY;
  if (!expected) {
    return c.json({ error: "服务端未配置 MOYUAN_API_KEY" }, 500);
  }
  const auth = c.req.header("Authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || token !== expected) {
    return c.json({ error: "未授权：请在 Authorization 头携带有效的 API Key" }, 401);
  }
  await next();
});

/** 惰性创建 service_role 客户端（在请求内创建，便于复用连接） */
function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("服务端未配置 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// ---------- 健康检查 ----------
app.get("/health", (c) => c.json({ ok: true }));

// ---------- 小说 ----------
app.get("/novels", async (c) => {
  const supabase = getSupabase();
  const novels = await listNovels(supabase);
  return c.json({ novels });
});

app.post("/novels", async (c) => {
  const supabase = getSupabase();
  const body = await c.req.json<NovelInput>();
  const novel = await createNovel(supabase, body);
  return c.json({ novel }, 201);
});

app.get("/novels/:id", async (c) => {
  const supabase = getSupabase();
  const graph = await fetchGraph(supabase, c.req.param("id"));
  if (!graph) return c.json({ error: "小说不存在" }, 404);
  return c.json(graph);
});

app.put("/novels/:id", async (c) => {
  const supabase = getSupabase();
  const body = await c.req.json<NovelPatch>();
  await updateNovel(supabase, c.req.param("id"), body);
  const graph = await fetchGraph(supabase, c.req.param("id"));
  return c.json(graph ? graph.novel : { ok: true });
});

app.delete("/novels/:id", async (c) => {
  const supabase = getSupabase();
  await deleteNovel(supabase, c.req.param("id"));
  return c.json({ ok: true });
});

// ---------- 角色 ----------
app.post("/novels/:id/characters", async (c) => {
  const supabase = getSupabase();
  const body = await c.req.json<CharacterInput>();
  const character = await addCharacter(supabase, c.req.param("id"), body);
  return c.json({ character }, 201);
});

app.put("/novels/:id/characters/:cid", async (c) => {
  const supabase = getSupabase();
  const body = await c.req.json<Partial<CharacterInput>>();
  await updateCharacter(supabase, c.req.param("cid"), body);
  return c.json({ ok: true });
});

app.delete("/novels/:id/characters/:cid", async (c) => {
  const supabase = getSupabase();
  await removeCharacter(supabase, c.req.param("id"), c.req.param("cid"));
  return c.json({ ok: true });
});

// ---------- 关系 ----------
app.post("/novels/:id/relations", async (c) => {
  const supabase = getSupabase();
  const body = await c.req.json<RelationInput>();
  const relation = await addRelation(supabase, c.req.param("id"), body);
  return c.json({ relation }, 201);
});

app.put("/novels/:id/relations/:rid", async (c) => {
  const supabase = getSupabase();
  const body = await c.req.json<Partial<RelationInput>>();
  await updateRelation(supabase, c.req.param("rid"), body);
  return c.json({ ok: true });
});

app.delete("/novels/:id/relations/:rid", async (c) => {
  const supabase = getSupabase();
  await removeRelation(supabase, c.req.param("id"), c.req.param("rid"));
  return c.json({ ok: true });
});

// ---------- 增量对账（核心：提交整本小说的完整状态） ----------
app.post("/novels/:id/reconcile", async (c) => {
  const supabase = getSupabase();
  const id = c.req.param("id");
  const body = await c.req.json<{
    novel?: Partial<Novel>;
    characters?: Character[];
    relations?: Relation[];
  }>();

  let novel: Novel;
  const existing = await fetchGraph(supabase, id);
  if (existing) {
    await updateNovel(supabase, id, body.novel ?? {});
    novel = (await fetchGraph(supabase, id))!.novel;
  } else {
    novel = await createNovel(supabase, {
      title: body.novel?.title ?? "未命名",
      ...(body.novel ?? {}),
    });
  }

  const characters = body.characters ?? existing?.characters ?? [];
  const relations = body.relations ?? existing?.relations ?? [];
  await reconcileNovel(supabase, novel, characters, relations);

  const result = await fetchGraph(supabase, id);
  return c.json(result);
});

export default handle(app);
