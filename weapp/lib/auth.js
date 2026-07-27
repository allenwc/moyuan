const { signInWithPassword, signInWithWeChat, callFunction } = require("./http");
const { saveSession, clearSession, getSession } = require("./session");

function pickUid(body) {
  if (!body || typeof body !== "object") return "";
  const nested = body.user || body.data || {};
  return String(
    body.sub ||
      body.user_id ||
      body.uid ||
      nested.uid ||
      nested.id ||
      nested.sub ||
      "",
  );
}

/** 会话完整：有 accessToken + user.uid；否则清掉残缺缓存 */
function getValidSession() {
  const s = getSession();
  if (!s) return null;
  const token = s.accessToken;
  const uid = s.user && s.user.uid;
  if (!token || !uid) {
    clearSession();
    return null;
  }
  return s;
}

function currentUser() {
  const s = getValidSession();
  return s && s.user ? s.user : null;
}

/** 未登录则清会话并跳转登录页；已登录返回 user */
function requireAuth() {
  const user = currentUser();
  if (user) return user;
  clearSession();
  wx.reLaunch({ url: "/pages/login/index" });
  return null;
}

/** 鉴权类错误：清会话并回登录 */
function handleAuthFailure(err) {
  const msg = (err && err.message) || "";
  const authLost =
    /未登录|会话已失效|401|unauthorized|token|auth/i.test(msg) ||
    msg === "未登录";
  if (!authLost) return false;
  clearSession();
  wx.reLaunch({ url: "/pages/login/index" });
  return true;
}

/** 邮箱/用户名密码登录（CloudBase Auth HTTP） */
async function loginWithEmail(username, password) {
  const body = await signInWithPassword(username, password);
  const accessToken = body.accessToken || body.access_token || "";
  const uid = pickUid(body);
  if (!accessToken) {
    throw new Error("登录成功但未返回 access_token");
  }
  if (!uid) {
    throw new Error("登录成功但未返回用户 ID，请联系管理员检查 Auth 配置");
  }
  const session = {
    accessToken,
    refreshToken: body.refresh_token || "",
    user: {
      uid,
      email: username.includes("@") ? username : null,
      channel: "email",
    },
  };
  saveSession(session);
  return session;
}

/** 微信小程序 code 登录（由云函数代理换取 token） */
async function loginWithWeChat(wxCode) {
  const body = await signInWithWeChat(wxCode);
  // 云函数返回 camelCase 字段（accessToken/refreshToken），也兼容网关 snake_case
  const accessToken = body.accessToken || body.access_token || "";
  const refreshToken = body.refreshToken || body.refresh_token || "";
  const uid = pickUid(body);
  if (!accessToken) {
    throw new Error("微信登录失败，未获取到 access_token");
  }
  if (!uid) {
    throw new Error("微信登录失败，未获取到用户 ID，请联系管理员检查 Auth 配置");
  }
  const session = {
    accessToken,
    refreshToken,
    user: {
      uid,
      channel: "wechat",
    },
  };
  saveSession(session);
  return session;
}

async function signOut() {
  clearSession();
}

/** 邮箱账号绑定微信：传 wx.login() 的 code，云端把 openid 写回邮箱账号行。
 *  绑定成功后，微信登录会自动解析为该邮箱账号，共享同一书库。 */
async function bindWeChat(wxCode) {
  const body = await callFunction("bindWeChat", { wxCode });
  if (!body || body.error) {
    throw new Error((body && body.error) || "绑定失败");
  }
  return body;
}

module.exports = {
  loginWithEmail,
  loginWithWeChat,
  bindWeChat,
  signOut,
  currentUser,
  getSession,
  getValidSession,
  requireAuth,
  handleAuthFailure,
};
