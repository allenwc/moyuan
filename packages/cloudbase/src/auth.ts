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

/** 登出 */
export async function signOut(app: CloudbaseApp) {
  return getAuth(app).signOut();
}
