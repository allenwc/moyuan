import Taro from "@tarojs/taro";

const KEY = "moyuan_auth";

export interface SessionUser {
  uid: string;
  email?: string | null;
  channel?: string | null;
}

export interface Session {
  /** CloudBase access token */
  accessToken: string;
  /** CloudBase refresh token */
  refreshToken?: string;
  user: SessionUser;
}

/** 读写均用 Taro 跨平台 Storage（H5 → localStorage，weapp → wx.storage） */
function getItem(key: string): any {
  try {
    return Taro.getStorageSync(key);
  } catch {
    return null;
  }
}

function setItem(key: string, value: unknown): void {
  try {
    Taro.setStorageSync(key, value);
  } catch {
    /* ignore */
  }
}

function removeItem(key: string): void {
  try {
    Taro.removeStorageSync(key);
  } catch {
    /* ignore */
  }
}

export function loadSession(): Session | null {
  return (getItem(KEY) as Session) || null;
}

export function saveSession(session: Session): void {
  setItem(KEY, session);
}

export function clearSession(): void {
  removeItem(KEY);
}
