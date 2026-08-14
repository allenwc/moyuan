import { create } from "zustand";
import {
  loadSession,
  saveSession,
  clearSession,
  getCloudbaseApp,
  getLoginState,
  getAccessToken,
  isAuthError,
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
  /** 登录态失效类错误：清会话并登出；返回是否已处理（是鉴权错误） */
  handleAuthError: (err: unknown) => boolean;
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
        // SDK 认为有登录态。取真实 token：凭据已失效时 SDK 会 reject（unauthenticated），
        // 此时不应再信任本地缓存，直接按未登录处理。
        let accessToken = "";
        try {
          accessToken = await getAccessToken(app);
        } catch (err) {
          if (isAuthError(err)) {
            clearSession();
            set({ user: null, session: null, ready: true });
            return;
          }
          // 网络等瞬时错误：回退到本地缓存（下面统一处理）
        }
        if (accessToken) {
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
            cbUser?.email ||
            lsEmail ||
            (sameUser ? cached?.user?.email : null) ||
            null;
          const channel =
            (sameUser && cached?.user?.channel) ||
            (email ? "email" : "cloudbase");
          const session: Session = {
            accessToken,
            refreshToken: "",
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
      }
    } catch {
      // CloudBase 未登录或无网络
    }

    // SDK 无登录态：仅当本地缓存是完整会话（有 token + uid）时才视为已登录，
    // 否则清掉残缺缓存，回到登录页。
    const cached = loadSession();
    if (cached && cached.accessToken && cached.user?.uid) {
      set({ user: cached.user, session: cached, ready: true });
    } else {
      clearSession();
      set({ ready: true });
    }
  },

  loginWithEmailPassword: async (email, password) => {
    const app = getCloudbaseApp();
    const loginState = await signInWithEmail(app, email, password);
    // signInWithEmail 返回的 LoginState 不暴露 credential，取 SDK 真实 token 落缓存
    let accessToken = "";
    try {
      accessToken = await getAccessToken(app);
    } catch {
      // token 获取失败不阻断登录展示（SDK 内部已持有效凭据，接口调用可正常鉴权）
    }
    const cbUser = app.auth().currentUser as
      | { uid?: string; email?: string | null }
      | null
      | undefined;
    const lsUser = (loginState as { user?: { uid?: string } | null })
      ?.user;
    const session: Session = {
      accessToken,
      user: {
        uid: cbUser?.uid || lsUser?.uid || "",
        email: cbUser?.email || email,
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

  handleAuthError: (err: unknown) => {
    if (!isAuthError(err)) return false;
    void useAuthStore.getState().signOut();
    return true;
  },
}));
