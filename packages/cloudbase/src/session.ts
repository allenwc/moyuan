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

/** 同步 Storage 适配器（H5: localStorage；weapp: wx.storage） */
export interface SyncStorage {
  getItem(key: string): unknown;
  setItem(key: string, value: unknown): void;
  removeItem(key: string): void;
}

const KEY = "moyuan_auth";

export interface SessionStore {
  loadSession(): Session | null;
  saveSession(session: Session): void;
  clearSession(): void;
}

export function createSessionStore(storage: SyncStorage): SessionStore {
  return {
    loadSession() {
      try {
        return (storage.getItem(KEY) as Session) || null;
      } catch {
        return null;
      }
    },
    saveSession(session: Session) {
      try {
        storage.setItem(KEY, session);
      } catch {
        /* ignore */
      }
    },
    clearSession() {
      try {
        storage.removeItem(KEY);
      } catch {
        /* ignore */
      }
    },
  };
}

/** 浏览器 localStorage 适配（值以 JSON 存取，兼容对象 Session） */
export function createWebStorage(): SyncStorage {
  return {
    getItem(key) {
      if (typeof localStorage === "undefined") return null;
      const raw = localStorage.getItem(key);
      if (raw == null) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    },
    setItem(key, value) {
      if (typeof localStorage === "undefined") return;
      localStorage.setItem(key, JSON.stringify(value));
    },
    removeItem(key) {
      if (typeof localStorage === "undefined") return;
      localStorage.removeItem(key);
    },
  };
}
