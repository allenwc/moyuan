/**
 * 带登录态防护的 PgDb 包装：云端调用因登录态失效（token 过期且刷新失败、
 * 凭据被清除等）失败时，自动清会话并回到登录页，避免停留在
 * “已登录但所有云端数据加载失败”的假状态。
 */
import type { PgDb } from "@moyuan/core";
import { getPgDb } from "@/lib/cloudbase";
import { useAuthStore } from "@/store/useAuthStore";
import { goLogin } from "@/lib/nav";

export function getGuardedPgDb(): PgDb {
  const db = getPgDb();
  return {
    async query<T>(sql: string): Promise<T[]> {
      try {
        return await db.query<T>(sql);
      } catch (err) {
        if (useAuthStore.getState().handleAuthError(err)) {
          goLogin();
        }
        throw err;
      }
    },
  };
}
