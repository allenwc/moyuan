import type { PgDb, Row } from "@moyuan/core";
import type { CloudbaseApp } from "./app";

/**
 * 通过云函数 `pg` 执行 SQL。
 * 云函数接收 `{ sql }`，返回 `{ rows }` 或 `{ error }`。
 */
export function createPgDb(app: CloudbaseApp): PgDb {
  return {
    async query<T = Row>(sql: string): Promise<T[]> {
      const result = await app.callFunction({
        name: "pg",
        data: { sql },
      });
      const data: any = (result as any).result ?? result;
      if (data?.error) {
        throw new Error(`[PG] ${data.error}`);
      }
      return (data?.rows ?? []) as T[];
    },
  };
}
