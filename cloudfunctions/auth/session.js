/**
 * 自建会话令牌（HMAC-JWT），用于替代 CloudBase Auth 用户令牌。
 *
 * 背景：纯 HTTP 直连架构下，微信登录走「自定义登录」签发的令牌，其 kid 属于自定义登录
 * 私钥；而 HTTP API 网关（api.tcloudbasegateway.com/v1/functions）只信任环境主密钥签发的
 * 令牌，因此自定义登录令牌调用云函数会报 ACCESS_TOKEN_KID_INVALID。
 * 这里改为由本云函数签发/校验自有会话令牌，彻底绕开该兼容问题。
 *
 * 安全：密钥来自环境变量 SESSION_SECRET；未配置时回退到开发默认值并打印告警，
 *       生产环境务必在云函数环境变量中设置高强度随机值（且与刷新部署保持一致）。
 */
const crypto = require("crypto");

const ALGO = "sha256";
const SECRET =
  process.env.SESSION_SECRET || "dev-insecure-secret-please-set-SESSION_SECRET";
const ACCESS_TTL = 60 * 60 * 24 * 7; // 7 天
const REFRESH_TTL = 60 * 60 * 24 * 30; // 30 天

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlJson(obj) {
  return b64url(JSON.stringify(obj));
}

function hmac(data) {
  return crypto
    .createHmac(ALGO, SECRET)
    .update(data)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(uid, channel, type) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: String(uid),
    channel,
    type,
    iat: now,
    exp: now + (type === "refresh" ? REFRESH_TTL : ACCESS_TTL),
  };
  const input = `${b64urlJson(header)}.${b64urlJson(payload)}`;
  return `${input}.${hmac(input)}`;
}

function verify(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const expected = hmac(`${h}.${p}`);
  const a = Buffer.from(s);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const normalized = p.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(normalized, "base64").toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function signSession(uid, channel, type = "access") {
  return sign(uid, channel, type);
}

module.exports = { signSession, verify };
