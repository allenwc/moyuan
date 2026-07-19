import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  fetchAll as coreFetchAll,
  reconcileNovel as coreReconcile,
  deleteNovel as coreDeleteNovel,
  type Character,
  type Novel,
  type Relation,
  type RemoteSnapshot,
} from "@moyuan/core";

export type { RemoteSnapshot };

/**
 * 浏览器端持久化仓储薄封装：复用 @moyuan/core 的纯逻辑，
 * 注入浏览器 anon client，并保留“未配置 Supabase 时静默跳过”的行为。
 */

/** 启动时全量拉取云端数据（无配置时返回空快照） */
export async function fetchAll(): Promise<RemoteSnapshot> {
  if (!isSupabaseConfigured) {
    return { novels: [], characters: [], relations: [] };
  }
  return coreFetchAll(supabase);
}

/** 将某本小说当前状态对账到云端（无配置时静默跳过） */
export async function reconcileNovel(
  novel: Novel,
  characters: Character[],
  relations: Relation[],
): Promise<void> {
  if (!isSupabaseConfigured) return;
  return coreReconcile(supabase, novel, characters, relations);
}

/** 删除整本小说（无配置时静默跳过） */
export async function deleteNovelRemote(novelId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  return coreDeleteNovel(supabase, novelId);
}
