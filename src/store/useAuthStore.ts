import { create } from "zustand";
import Taro from "@tarojs/taro";
import { api } from "@/lib/api";
import {
  loadSession,
  saveSession,
  clearSession,
  type Session,
} from "@/lib/authStorage";
import { getAuth, signInWithEmail, getLoginState, signOut as cbSignOut } from "@/lib/cloudbase";

interface AuthState {
  ready: boolean;
  user: Session["user"] | null;
  session: Session | null;
  error: string | null;
  init: () => Promise<void>;
  /** 邮箱密码登录（CloudBase Auth） */
  loginWithEmailPassword: (email: string, password: string) => Promise<void>;
  /** 微信小程序一键登录（仍走旧 REST API） */
  loginWithWechatMini: () => Promise<void>;
  /** H5 微信扫码回调（仍走旧 REST API） */
  loginWithWechatWebCode: (code: string) => Promise<void>;
  /** 获取微信网页授权 URL（仍走旧 REST API） */
  fetchWechatWebAuthorizeUrl: (redirectUri: string) => Promise<string>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  ready: false,
  user: null,
  session: null,
  error: null,

  init: async () => {
    try {
      const loginState = await getLoginState();
      if (loginState) {
        const auth = getAuth();
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

    // 回退：尝试本地缓存的 session
    const cached = loadSession();
    if (cached) {
      set({ user: cached.user, session: cached, ready: true });
    } else {
      set({ ready: true });
    }
  },

  loginWithEmailPassword: async (email, password) => {
    const loginState = await signInWithEmail(email, password);
    const auth = getAuth();
    const cbUser = auth.currentUser;
    const session: Session = {
      accessToken: loginState.credential?.accessToken || "",
      refreshToken: loginState.credential?.refreshToken || "",
      user: {
        uid: cbUser?.uid || loginState.user?.uid || "",
        email: (cbUser as any)?.email || email,
        channel: "email",
      },
    };
    saveSession(session);
    set({ session, user: session.user, error: null });
  },

  // ---- 以下微信登录方法仍使用旧 REST API，待后续迁移 ----

  loginWithWechatMini: async () => {
    const { code } = await Taro.login();
    const { session } = await api.post<{ session: Session }>("/auth/wechat/mini", {
      code,
    });
    saveSession(session);
    set({ session, user: session.user, error: null });
  },

  loginWithWechatWebCode: async (code) => {
    const { session } = await api.post<{ session: Session }>("/auth/wechat/web", {
      code,
    });
    saveSession(session);
    set({ session, user: session.user, error: null });
  },

  fetchWechatWebAuthorizeUrl: async (redirectUri) => {
    const { authorizeUrl } = await api.get<{ authorizeUrl: string }>(
      `/auth/wechat/web/authorize-url?redirect_uri=${encodeURIComponent(redirectUri)}`,
    );
    return authorizeUrl;
  },

  signOut: async () => {
    try {
      await cbSignOut();
    } catch {
      // 忽略 CloudBase 登出失败
    }
    clearSession();
    set({ session: null, user: null, error: null });
  },
}));
