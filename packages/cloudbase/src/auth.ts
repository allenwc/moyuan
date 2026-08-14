import type { CloudbaseApp } from "./app";
import { getAuth } from "./app";

/** 匿名登录（已登录则直接返回） */
export async function signInAnonymously(app: CloudbaseApp) {
  const auth = getAuth(app);
  const loginState = await auth.getLoginState();
  if (loginState) return loginState;
  return auth.signInAnonymously();
}

/** 邮箱密码登录 */
export async function signInWithEmail(
  app: CloudbaseApp,
  email: string,
  password: string,
) {
  return getAuth(app).signInWithEmailAndPassword(email, password);
}

/** 当前登录状态 */
export async function getLoginState(app: CloudbaseApp) {
  return getAuth(app).getLoginState();
}

/**
 * 当前可用的 access token（SDK 自动管理刷新）。
 * 凭据缺失/失效时 SDK 会 reject（错误对象形如 { error: "unauthenticated", ... }），
 * 调用方可用 isAuthError 判断。
 */
export async function getAccessToken(app: CloudbaseApp): Promise<string> {
  const res = (await getAuth(app).getAccessToken()) as
    | { accessToken?: string }
    | undefined;
  return res?.accessToken || "";
}

/**
 * 是否为登录态失效类错误（凭据缺失 / token 过期 / 未授权）。
 * @cloudbase/js-sdk 的鉴权失败通常 reject 一个普通对象（非 Error），
 * 形如 { error: "unauthenticated", error_description: "credentials not found" }，
 * 这里同时兼容 Error 与普通对象两种形态。
 */
export function isAuthError(err: unknown): boolean {
  if (!err) return false;
  const e = err as {
    error?: unknown;
    code?: unknown;
    message?: unknown;
  };
  const text = [e.error, e.code, e.message]
    .filter((v) => v != null)
    .join(" ")
    .toLowerCase();
  return /unauthenticated|unauthorized|access_token_expired|invalid_grant|invalid_token|invalid_credentials|credentials? (not found|are invalid|invalid)|401/.test(
    text,
  );
}

/** 登出 */
export async function signOut(app: CloudbaseApp) {
  return getAuth(app).signOut();
}
