/**
 * novelRepo（前端适配层）—— 将 core 包的纯函数注入 CloudBase PgDb 适配器，
 * 所有数据直接通过 CloudBase 云函数 `pg` 访问 PostgreSQL。
 *
 * 注意：api/ 是对外 REST API，前端自身数据访问不经过它。
 */
import { pgDb } from "@/lib/cloudbase";
import {
  fetchAll as coreFetchAll,
  reconcileNovel as coreReconcile,
  deleteNovel as coreDeleteNovel,
} from "@moyuan/core";
import type { RemoteSnapshot, Novel, Character, Relation } from "@moyuan/core";

export type { RemoteSnapshot };

/** 从云端拉取当前用户的全量快照 */
export async function fetchAll(userId: string): Promise<RemoteSnapshot> {
  return coreFetchAll(pgDb, { userId });
}

/** 将本地状态以云端为事实来源进行对账（upsert 模式） */
export async function reconcileNovel(
  novel: Novel,
  characters: Character[],
  relations: Relation[],
): Promise<void> {
  await coreReconcile(pgDb, novel, characters, relations);
}

/** 删除整本小说 */
export async function deleteNovelRemote(id: string): Promise<void> {
  await coreDeleteNovel(pgDb, id);
}
