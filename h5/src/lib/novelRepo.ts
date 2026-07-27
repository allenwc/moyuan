/**
 * novelRepo（H5）—— 注入 CloudBase PgDb，经云函数 `pg` 访问 PostgreSQL。
 */
import { getPgDb } from "@/lib/cloudbase";
import {
  fetchAll as coreFetchAll,
  reconcileNovel as coreReconcile,
  deleteNovel as coreDeleteNovel,
} from "@moyuan/core";
import type { RemoteSnapshot, Novel, Character, Relation } from "@moyuan/core";

export type { RemoteSnapshot };

export async function fetchAll(userId: string): Promise<RemoteSnapshot> {
  return coreFetchAll(getPgDb(), { userId });
}

export async function reconcileNovel(
  novel: Novel,
  characters: Character[],
  relations: Relation[],
): Promise<void> {
  await coreReconcile(getPgDb(), novel, characters, relations);
}

export async function deleteNovelRemote(id: string): Promise<void> {
  await coreDeleteNovel(getPgDb(), id);
}
