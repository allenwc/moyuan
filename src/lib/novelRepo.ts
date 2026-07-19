import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type {
  Character,
  Direction,
  Novel,
  Relation,
  RelationType,
  ThemeColor,
} from "@/types";

/**
 * Supabase 持久化仓储层。
 *
 * 设计：本地 Zustand store 为同步的 UI 数据源，此层负责把变更“写穿”到 Supabase，
 * 并在启动时做一次全量水合。对单本小说采用“增量对账（reconcile）”：
 * upsert 当前存在的行 + 删除云端多余的行，从而统一覆盖 增删改/拖拽/撤销重做/复制 等所有场景。
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

/** 将 id 列表格式化为 PostgREST `in` 过滤所需的 `("a","b")` 形式 */
function idList(ids: string[]): string {
  return `(${ids.map((id) => `"${id.replace(/"/g, '""')}"`).join(",")})`;
}

/** 启动时全量拉取云端数据 */
export async function fetchAll(): Promise<RemoteSnapshot> {
  if (!isSupabaseConfigured) {
    return { novels: [], characters: [], relations: [] };
  }
  const [novelsRes, charsRes, relsRes] = await Promise.all([
    supabase.from("novels").select("*"),
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

/**
 * 将某本小说当前的本地状态对账到云端：
 * upsert 现存 novel/characters/relations，并删除云端多余的 characters/relations。
 */
export async function reconcileNovel(
  novel: Novel,
  characters: Character[],
  relations: Relation[],
): Promise<void> {
  if (!isSupabaseConfigured) return;
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

/** 删除整本小说（级联删除角色与关系） */
export async function deleteNovelRemote(novelId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from("novels").delete().eq("id", novelId);
  if (error) throw error;
}
