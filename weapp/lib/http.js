/**
 * 小程序端 CloudBase HTTP 客户端。
 * 不使用 wx.cloud（那是微信云开发环境）；独立 CloudBase 环境走网关 HTTP。
 */
const { gatewayBase, httpServiceBase } = require("./config");
const { getSession } = require("./session");

function request({ url, method = "POST", data, token }) {
  return new Promise((resolve, reject) => {
    const header = { "Content-Type": "application/json" };
    if (token) header.Authorization = `Bearer ${token}`;
    wx.request({
      url,
      method,
      data: data || {},
      header,
      success(res) {
        const body = res.data;
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
          return;
        }
        const msg =
          (body &&
            (body.error_description ||
              body.message ||
              body.error ||
              body.code)) ||
          `请求失败 (${res.statusCode})`;
        reject(new Error(typeof msg === "string" ? msg : JSON.stringify(msg)));
      },
      fail(err) {
        reject(
          new Error(
            (err && err.errMsg) || "网络请求失败，请检查合法域名与网络",
          ),
        );
      },
    });
  });
}

/** 邮箱/用户名密码登录 → 由 auth 云函数代理签发自建会话令牌 */
async function signInWithPassword(username, password) {
  const body = await request({
    url: `${httpServiceBase()}/api/auth`,
    data: { action: "signInWithEmail", email: username, password },
  });
  if (!body || !body.accessToken) {
    throw new Error(
      (body && (body.error || body.error_description)) || "登录失败",
    );
  }
  return body;
}

/** 微信小程序 code 登录 → 由云函数代理换取 access_token */
async function signInWithWeChat(wxCode) {
  const body = await request({
    url: `${httpServiceBase()}/api/auth`,
    data: { action: "signInWithWeChat", wxCode },
  });
  if (!body || !body.accessToken) {
    throw new Error(
      (body && (body.error || body.error_description)) || "微信登录失败",
    );
  }
  return body;
}

/**
 * 调用云函数（需已登录拿到自建会话令牌）
 * 统一经 auth 云函数 HTTP 访问服务入口，携带 sessionToken 供服务端校验。
 */
async function callFunction(name, data) {
  const session = getSession();
  const token = session && session.accessToken;
  if (!token) throw new Error("未登录或会话已失效");
  try {
    return await request({
      url: `${httpServiceBase()}/api/auth`,
      data: { action: name, sessionToken: token, ...(data || {}) },
    });
  } catch (err) {
    const msg = (err && err.message) || "";
    // 常见未授权文案 → 统一成可被页面识别的鉴权失败
    if (/401|unauthorized|token.*(invalid|expired)|access.?token|会话已失效/i.test(msg)) {
      throw new Error("未登录或会话已失效");
    }
    throw err;
  }
}

module.exports = { request, signInWithPassword, signInWithWeChat, callFunction };
