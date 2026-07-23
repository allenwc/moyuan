import cloudbase from "@cloudbase/js-sdk/app";
import { registerAuth } from "@cloudbase/js-sdk/auth";
import { registerFunctions } from "@cloudbase/js-sdk/functions";
import type { PgDb, Row } from "../../packages/core/src/sql";

const envId = process.env.TARO_APP_CLOUDBASE_ENV_ID || "";

/** CloudBase App 单例 */
let app: cloudbase.app.App | null = null;

export function getCloudbase(): cloudbase.app.App {
  if (!app) {
    if (!envId) {
      throw new Error("未配置 TARO_APP_CLOUDBASE_ENV_ID，无法初始化 CloudBase SDK");
    }
    app = cloudbase.init({ env: envId });
    registerAuth(app);
    registerFunctions(app);
  }
  return app;
}

/** 获取 CloudBase Auth 实例 */
export function getAuth() {
  return getCloudbase().auth();
}

/** 匿名登录（获取云端访问凭证，用于无需注册即可读写数据） */
export async function signInAnonymously() {
  const auth = getAuth();
  const loginState = await auth.getLoginState();
  if (loginState) return loginState;
  return auth.signInAnonymously();
}

/** 邮箱密码登录 */
export async function signInWithEmail(email: string, password: string) {
  const auth = getAuth();
  return auth.signInWithEmailAndPassword(email, password);
}

/** 获取当前登录状态 */
export async function getLoginState() {
  return getAuth().getLoginState();
}

/** 登出 */
export async function signOut() {
  return getAuth().signOut();
}

// ========== PostgreSQL 查询（通过云函数 pg 代理） ==========

/**
 * 通过 CloudBase 云函数执行 PostgreSQL 原生 SQL 查询。
 * 云函数 `pg` 接收 `{ sql }`，返回 `{ rows: Row[] }`（已按列名映射为对象）。
 */
async function runQuery<T = Row>(sql: string): Promise<T[]> {
  const app = getCloudbase();
  const result = await app.callFunction({
    name: "pg",
    data: { sql },
  });
  // callFunction 返回的是 result，嵌套在 result.result 中
  const data: any = (result as any).result ?? result;
  if (data?.error) {
    throw new Error(`[PG] ${data.error}`);
  }
  return (data?.rows ?? []) as T[];
}

/** 前端 PgDb 适配器 — 通过云函数访问 CloudBase PostgreSQL */
export const pgDb: PgDb = {
  query: runQuery,
};
