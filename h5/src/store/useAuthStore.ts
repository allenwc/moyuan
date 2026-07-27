import { create } from "zustand";
import {
  loadSession,
  saveSession,
  clearSession,
  getCloudbaseApp,
  getLoginState,
  signInWithEmail,
  cbSignOut,
  type Session,
} from "@/lib/cloudbase";

interface AuthState {
  ready: boolean;
  user: Session["user"] | null;
  session: Session | null;
  error: string | null;
  init: () => Promise<void>;
  loginWithEmailPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  ready: false,
  user: null,
  session: null,
  error: null,

  init: async () => {
    try {
      const app = getCloudbaseApp();
      const loginState = await getLoginState(app);
      if (loginState) {
        const auth = app.auth();
        const cbUser = auth.currentUser as
          | { uid?: string; email?: string | null }
          | null
          | undefined;
        const lsUser = loginState.user as
          | { uid?: string; email?: string | null; username?: string | null }
          | null
          | undefined;
        const cached = loadSession();
        const uid = cbUser?.uid || lsUser?.uid || cached?.user?.uid || "";
        const lsIdentity = lsUser?.email || lsUser?.username || null;
        const lsEmail =
          lsIdentity && lsIdentity.includes("@") ? lsIdentity : null;
        const sameUser = Boolean(uid && cached?.user?.uid === uid);
        const email =
          cbUser?.email || lsEmail || (sameUser ? cached?.user?.email : null) || null;
        const channel =
          (sameUser && cached?.user?.channel) ||
          (email ? "email" : "cloudbase");
        const session: Session = {
          accessToken: loginState.credential?.accessToken || "",
          refreshToken: loginState.credential?.refreshToken || "",
          user: {
            uid,
            email,
            channel,
          },
        };
        saveSession(session);
        set({ user: session.user, session, ready: true });
        return;
      }
    } catch {
      // CloudBase 未登录或无网络
    }

    const cached = loadSession();
    if (cached) {
      set({ user: cached.user, session: cached, ready: true });
    } else {
      set({ ready: true });
    }
  },

  loginWithEmailPassword: async (email, password) => {
    const app = getCloudbaseApp();
    const loginState = await signInWithEmail(app, email, password);
    const cbUser = app.auth().currentUser;
    const session: Session = {
      accessToken: loginState.credential?.accessToken || "",
      refreshToken: loginState.credential?.refreshToken || "",
      user: {
        uid: cbUser?.uid || loginState.user?.uid || "",
        email: (cbUser as { email?: string } | null)?.email || email,
        channel: "email",
      },
    };
    saveSession(session);
    set({ session, user: session.user, error: null });
  },

  signOut: async () => {
    try {
      await cbSignOut(getCloudbaseApp());
    } catch {
      // 忽略
    }
    clearSession();
    set({ session: null, user: null, error: null });
  },
}));
