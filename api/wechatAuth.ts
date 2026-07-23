import type { Db } from "./db";
import { lit, uid } from "@moyuan/core";
import { issueSession } from "./authSession";

const WX_APPID = process.env.TARO_APP_WECHAT_APPID || process.env.WECHAT_APPID || "";
const WX_SECRET =
  process.env.TARO_APP_WECHAT_SECRET || process.env.WECHAT_SECRET || "";

interface MiniSession {
  openid: string;
  session_key: string;
  unionid?: string;
}
interface WebToken {
  access_token: string;
  openid: string;
  unionid?: string;
}

/** 小程序 jscode2session：用登录 code 换取 openid / session_key。 */
export async function exchangeMiniCode(code: string): Promise<MiniSession> {
  if (!WX_APPID || !WX_SECRET) throw new Error("未配置微信 AppId / Secret");
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${WX_APPID}&secret=${WX_SECRET}&js_code=${code}&grant_type=authorization_code`;
  const res = await fetch(url);
  const data = (await res.json()) as MiniSession & { errcode?: number; errmsg?: string };
  if (!data.openid) throw new Error(data.errmsg || "微信登录失败");
  return data;
}

/** 网页授权 code 换 access_token（含 openid / unionid）。 */
export async function exchangeWebCode(code: string): Promise<WebToken> {
  if (!WX_APPID || !WX_SECRET) throw new Error("未配置微信 AppId / Secret");
  const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WX_APPID}&secret=${WX_SECRET}&code=${code}&grant_type=authorization_code`;
  const res = await fetch(url);
  const data = (await res.json()) as WebToken & { errcode?: number; errmsg?: string };
  if (!data.openid) throw new Error(data.errmsg || "微信网页授权失败");
  return data;
}

/** 构造微信网页授权跳转地址（snsapi_base，仅取 openid）。 */
export function buildWebAuthorizeUrl(redirectUri: string): string {
  const encoded = encodeURIComponent(redirectUri);
  return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${WX_APPID}&redirect_uri=${encoded}&response_type=code&scope=snsapi_base&state=moyuan#wechat_redirect`;
}

/** 按 openid / unionid 稳定映射出内部用户（首次自动创建）。 */
async function ensureUser(
  db: Db,
  identity: { openid: string; unionid?: string; channel: string },
): Promise<string> {
  const stableKey = identity.unionid || `${identity.channel}:${identity.openid}`;
  const existing = await db.query<{ id: unknown }>(
    `SELECT id FROM users WHERE wechat_stable_key = ${lit(stableKey)}`,
  );
  if (existing.length) return String(existing[0].id);
  const id = uid("user");
  await db.query(
    `INSERT INTO users (id, wechat_openid, wechat_unionid, wechat_stable_key, channel, created_at) VALUES (${lit(
      id,
    )}, ${lit(identity.openid)}, ${lit(identity.unionid ?? null)}, ${lit(
      stableKey,
    )}, ${lit(identity.channel)}, ${lit(Date.now())})`,
  );
  return id;
}

export async function loginMiniWithCode(db: Db, code: string): Promise<ReturnType<typeof issueSession>> {
  const wx = await exchangeMiniCode(code);
  const userId = await ensureUser(db, {
    openid: wx.openid,
    unionid: wx.unionid,
    channel: "mini",
  });
  return issueSession(userId, { channel: "mini" });
}

export async function loginWebWithCode(db: Db, code: string): Promise<ReturnType<typeof issueSession>> {
  const wx = await exchangeWebCode(code);
  const userId = await ensureUser(db, {
    openid: wx.openid,
    unionid: wx.unionid,
    channel: "web",
  });
  return issueSession(userId, { channel: "web" });
}
