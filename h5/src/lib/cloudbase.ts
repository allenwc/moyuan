import {
  createApp,
  createPgDb,
  createSessionStore,
  createWebStorage,
  getLoginState,
  signInWithEmail,
  signOut as cbSignOut,
  type CloudbaseApp,
  type Session,
  type SessionStore,
} from "@moyuan/cloudbase";
import type { PgDb } from "@moyuan/core";

const envId = (import.meta.env.VITE_CLOUDBASE_ENV_ID as string) || "";

let app: CloudbaseApp | null = null;
let pg: PgDb | null = null;
let sessions: SessionStore | null = null;

export function getCloudbaseApp(): CloudbaseApp {
  if (!app) {
    app = createApp({ envId });
  }
  return app;
}

export function getPgDb(): PgDb {
  if (!pg) {
    pg = createPgDb(getCloudbaseApp());
  }
  return pg;
}

export function getSessionStore(): SessionStore {
  if (!sessions) {
    sessions = createSessionStore(createWebStorage());
  }
  return sessions;
}

export {
  getLoginState,
  signInWithEmail,
  cbSignOut,
  type Session,
};

export function loadSession(): Session | null {
  return getSessionStore().loadSession();
}

export function saveSession(session: Session): void {
  getSessionStore().saveSession(session);
}

export function clearSession(): void {
  getSessionStore().clearSession();
}
