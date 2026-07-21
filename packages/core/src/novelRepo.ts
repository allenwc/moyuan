import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Character,
  CharacterInput,
  Direction,
  Gender,
  Novel,
  NovelInput,
  Relation,
  RelationInput,
  RelationType,
  ThemeColor,
} from "./types";
import { uid } from "./uid";

/**
 * 与运行环境无关的 Supabase 持久化逻辑。
 *
 * 所有函数都接收一个 `SupabaseClient` 参数（依赖注入），
 * 以便浏览器端（anon key）与服务端（service_role）复用同一份逻辑，
 * 而无需关心 key / RLS / import.meta.env。
 *
 * 数据模型：novels / characters / relations。对单本小说采用“增量对账（reconcile）”：
 * upsert 当前存在的行并删除云端多余的行，统一覆盖增删改 / 拖拽 / 复制等场景。
 */

// ---------- 数据库行类型 ----------
interface NovelRow {
  id: string;
  title: string;
  author: string;
  synopsis: string;
  theme_color: string;
  created_at: number;
  updated_at: number;
}

interface CharacterRow {
  id: string;
  novel_id: string;
  name: string;
  alias: string | null;
  role: string;
  faction: string;
  color: string;
  note: string;
  gender: string | null;
  x: number;
  y: number;
  created_at: number;
}

interface RelationRow {
  id: string;
  novel_id: string;
  source_id: string;
  target_id: string;
  type: string;
  direction: string;
  note: string;
  created_at: number;
}

// ---------- 行 <-> 领域对象 映射 ----------
function rowToNovel(r: NovelRow): Novel {
  return {
    id: r.id,
    title: r.title,
    author: r.author,
    synopsis: r.synopsis,
    themeColor: r.theme_color as ThemeColor,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  };
}

function novelToRow(n: Novel): NovelRow {
  return {
    id: n.id,
    title: n.title,
    author: n.author,
    synopsis: n.synopsis,
    theme_color: n.themeColor,
    created_at: n.createdAt,
    updated_at: n.updatedAt,
  };
}

function rowToCharacter(r: CharacterRow): Character {
  return {
    id: r.id,
    novelId: r.novel_id,
    name: r.name,
    alias: r.alias ?? undefined,
    role: r.role,
    faction: r.faction,
    gender: (r.gender as Gender) ?? undefined,
    color: r.color,
    note: r.note,
    x: Number(r.x),
    y: Number(r.y),
    createdAt: Number(r.created_at),
  };
}

function characterToRow(c: Character): CharacterRow {
  return {
    id: c.id,
    novel_id: c.novelId,
    name: c.name,
    alias: c.alias ?? null,
    role: c.role,
    faction: c.faction,
    gender: c.gender ?? null,
    color: c.color,
    note: c.note,
    x: c.x,
    y: c.y,
    created_at: c.createdAt,
  };
}

function rowToRelation(r: RelationRow): Relation {
  return {
    id: r.id,
    novelId: r.novel_id,
    sourceId: r.source_id,
    targetId: r.target_id,
    type: r.type as RelationType,
    direction: r.direction as Direction,
    note: r.note,
    createdAt: Number(r.created_at),
  };
}

function relationToRow(r: Relation): RelationRow {
  return {
    id: r.id,
    novel_id: r.novelId,
    source_id: r.sourceId,
    target_id: r.targetId,
    type: r.type,
    direction: r.direction,
    note: r.note,
    created_at: r.createdAt,
  };
}

export interface RemoteSnapshot {
  novels: Novel[];
  characters: Character[];
  relations: Relation[];
}

export interface NovelGraph {
  novel: Novel;
  characters: Character[];
  relations: Relation[];
}

/** 将 id 列表格式化为 PostgREST `in` 过滤所需的 `("a","b")` 形式 */
function idList(ids: string[]): string {
  return `(${ids.map((id) => `"${id.replace(/"/g, '""')}"`).join(",")})`;
}

// ---------- 查询 ----------

/** 全量拉取所有小说 / 角色 / 关系 */
export async function fetchAll(
  supabase: SupabaseClient,
): Promise<RemoteSnapshot> {
  const [novelsRes, charsRes, relsRes] = await Promise.all([
    supabase.from("novels").select("*").order("updated_at", { ascending: false }),
    supabase.from("characters").select("*"),
    supabase.from("relations").select("*"),
  ]);
  if (novelsRes.error) throw novelsRes.error;
  if (charsRes.error) throw charsRes.error;
  if (relsRes.error) throw relsRes.error;

  return {
    novels: (novelsRes.data as NovelRow[]).map(rowToNovel),
    characters: (charsRes.data as CharacterRow[]).map(rowToCharacter),
    relations: (relsRes.data as RelationRow[]).map(rowToRelation),
  };
}

/** 列出全部小说（按更新时间倒序） */
export async function listNovels(supabase: SupabaseClient): Promise<Novel[]> {
  const { data, error } = await supabase
    .from("novels")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as NovelRow[]).map(rowToNovel);
}

/** 拉取某本小说的完整图谱（小说本身 + 角色 + 关系），不存在时返回 null */
export async function fetchGraph(
  supabase: SupabaseClient,
  novelId: string,
): Promise<NovelGraph | null> {
  const { data: novelRow, error: novelErr } = await supabase
    .from("novels")
    .select("*")
    .eq("id", novelId)
    .maybeSingle();
  if (novelErr) throw novelErr;
  if (!novelRow) return null;

  const [charsRes, relsRes] = await Promise.all([
    supabase.from("characters").select("*").eq("novel_id", novelId),
    supabase.from("relations").select("*").eq("novel_id", novelId),
  ]);
  if (charsRes.error) throw charsRes.error;
  if (relsRes.error) throw relsRes.error;

  return {
    novel: rowToNovel(novelRow as NovelRow),
    characters: (charsRes.data as CharacterRow[]).map(rowToCharacter),
    relations: (relsRes.data as RelationRow[]).map(rowToRelation),
  };
}

// ---------- 小说 CRUD ----------

/** 创建小说（自动生成 id 与时间戳） */
export async function createNovel(
  supabase: SupabaseClient,
  input: NovelInput,
): Promise<Novel> {
  const now = Date.now();
  const novel: Novel = {
    id: uid("novel"),
    title: input.title?.trim() || "未命名",
    author: input.author?.trim() ?? "",
    synopsis: input.synopsis?.trim() ?? "",
    themeColor: input.themeColor ?? "vermillion",
    createdAt: now,
    updatedAt: now,
  };
  const { error } = await supabase.from("novels").insert(novelToRow(novel));
  if (error) throw error;
  return novel;
}

/** 更新小说的可编辑字段 */
export async function updateNovel(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Pick<Novel, "title" | "author" | "synopsis" | "themeColor">>,
): Promise<void> {
  const row: Partial<NovelRow> = { updated_at: Date.now() };
  if (patch.title !== undefined) row.title = patch.title.trim() || "未命名";
  if (patch.author !== undefined) row.author = patch.author.trim();
  if (patch.synopsis !== undefined) row.synopsis = patch.synopsis.trim();
  if (patch.themeColor !== undefined) row.theme_color = patch.themeColor;
  const { error } = await supabase.from("novels").update(row).eq("id", id);
  if (error) throw error;
}

/** 删除整本小说（级联删除其角色与关系） */
export async function deleteNovel(
  supabase: SupabaseClient,
  novelId: string,
): Promise<void> {
  const { error } = await supabase.from("novels").delete().eq("id", novelId);
  if (error) throw error;
}

// ---------- 角色 CRUD ----------

/** 新增角色（自动生成 id 与时间戳） */
export async function addCharacter(
  supabase: SupabaseClient,
  novelId: string,
  input: CharacterInput,
): Promise<Character> {
  const now = Date.now();
  const character: Character = {
    id: uid("char"),
    novelId,
    name: input.name?.trim() || "无名氏",
    alias: input.alias?.trim() || undefined,
    role: input.role,
    faction: input.faction,
    gender: input.gender ?? null,
    color: input.color,
    note: input.note,
    x: input.x,
    y: input.y,
    createdAt: now,
  };
  const { error } = await supabase
    .from("characters")
    .insert(characterToRow(character));
  if (error) throw error;
  return character;
}

/** 更新角色的可编辑字段 */
export async function updateCharacter(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<CharacterInput>,
): Promise<void> {
  const row: Partial<CharacterRow> = {};
  if (patch.name !== undefined) row.name = patch.name.trim() || "无名氏";
  if (patch.alias !== undefined) row.alias = patch.alias.trim() || null;
  if (patch.role !== undefined) row.role = patch.role;
  if (patch.faction !== undefined) row.faction = patch.faction;
  if (patch.gender !== undefined) row.gender = patch.gender ?? null;
  if (patch.color !== undefined) row.color = patch.color;
  if (patch.note !== undefined) row.note = patch.note;
  if (patch.x !== undefined) row.x = patch.x;
  if (patch.y !== undefined) row.y = patch.y;
  const { error } = await supabase.from("characters").update(row).eq("id", id);
  if (error) throw error;
}

/** 删除角色，同时清理引用它的关系 */
export async function removeCharacter(
  supabase: SupabaseClient,
  novelId: string,
  id: string,
): Promise<void> {
  const { error: relErr } = await supabase
    .from("relations")
    .delete()
    .eq("novel_id", novelId)
    .or(`source_id.eq.${id},target_id.eq.${id}`);
  if (relErr) throw relErr;
  const { error } = await supabase
    .from("characters")
    .delete()
    .eq("novel_id", novelId)
    .eq("id", id);
  if (error) throw error;
}

// ---------- 关系 CRUD ----------

/** 新增关系（自动生成 id 与时间戳） */
export async function addRelation(
  supabase: SupabaseClient,
  novelId: string,
  input: RelationInput,
): Promise<Relation> {
  const now = Date.now();
  const relation: Relation = {
    id: uid("rel"),
    novelId,
    sourceId: input.sourceId,
    targetId: input.targetId,
    type: input.type,
    direction: input.direction,
    note: input.note,
    createdAt: now,
  };
  const { error } = await supabase
    .from("relations")
    .insert(relationToRow(relation));
  if (error) throw error;
  return relation;
}

/** 更新关系的可编辑字段 */
export async function updateRelation(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<RelationInput>,
): Promise<void> {
  const row: Partial<RelationRow> = {};
  if (patch.sourceId !== undefined) row.source_id = patch.sourceId;
  if (patch.targetId !== undefined) row.target_id = patch.targetId;
  if (patch.type !== undefined) row.type = patch.type;
  if (patch.direction !== undefined) row.direction = patch.direction;
  if (patch.note !== undefined) row.note = patch.note;
  const { error } = await supabase.from("relations").update(row).eq("id", id);
  if (error) throw error;
}

/** 删除关系 */
export async function removeRelation(
  supabase: SupabaseClient,
  novelId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("relations")
    .delete()
    .eq("novel_id", novelId)
    .eq("id", id);
  if (error) throw error;
}

// ---------- 增量对账 ----------

/**
 * 将某本小说当前的完整状态对账到云端：
 * upsert 现存 novel/characters/relations，并删除云端多余的行。
 */
export async function reconcileNovel(
  supabase: SupabaseClient,
  novel: Novel,
  characters: Character[],
  relations: Relation[],
): Promise<void> {
  const novelId = novel.id;

  // 1. upsert 小说本身
  {
    const { error } = await supabase
      .from("novels")
      .upsert(novelToRow(novel), { onConflict: "id" });
    if (error) throw error;
  }

  // 2. upsert 角色
  if (characters.length > 0) {
    const { error } = await supabase
      .from("characters")
      .upsert(characters.map(characterToRow), { onConflict: "id" });
    if (error) throw error;
  }

  // 3. 删除云端多余角色（级联删除其关系）
  {
    const keepIds = characters.map((c) => c.id);
    let q = supabase.from("characters").delete().eq("novel_id", novelId);
    if (keepIds.length > 0) q = q.not("id", "in", idList(keepIds));
    const { error } = await q;
    if (error) throw error;
  }

  // 4. upsert 关系（此时端点角色均已存在）
  if (relations.length > 0) {
    const { error } = await supabase
      .from("relations")
      .upsert(relations.map(relationToRow), { onConflict: "id" });
    if (error) throw error;
  }

  // 5. 删除云端多余关系
  {
    const keepIds = relations.map((r) => r.id);
    let q = supabase.from("relations").delete().eq("novel_id", novelId);
    if (keepIds.length > 0) q = q.not("id", "in", idList(keepIds));
    const { error } = await q;
    if (error) throw error;
  }
}
