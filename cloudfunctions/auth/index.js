/**
 * 认证云函数 — 代理 CloudBase Auth 操作
 */
const https = require("https");
const cloudbase = require("@cloudbase/node-sdk");
const manager = require("@cloudbase/manager-node");
const { signSession, verify } = require("./session");

const ENV_ID = process.env.TCB_ENV_ID || "moyuan-d5gab9aqm5759b176";
const WX_APPID = process.env.WECHAT_APPID || "";
const WX_SECRET = process.env.WECHAT_SECRET || "";

/** CloudBase Node SDK 实例（云函数内自动注入凭证） */
const app = cloudbase.init({ env: ENV_ID });

/**
 * 自定义登录（微信一键登录）需要：
 *  1) CloudBase 控制台「身份认证 → 登录方式」开启「自定义登录」
 *  2) 下载私钥文件 tcb_custom_login.json 放到本目录（管理员级私钥，勿提交仓库）
 * 该实例仅在微信登录分支用于签发 ticket，缺失时不影响邮箱登录。
 */
let ticketApp = null;
try {
  ticketApp = cloudbase.init({
    env: ENV_ID,
    credentials: require("./tcb_custom_login.json"),
  });
} catch (e) {
  console.warn("[wechat] 未加载 tcb_custom_login.json，自定义登录（微信）暂不可用:", e.message);
}

/**
 * 邮箱/用户名密码登录使用 @cloudbase/js-sdk：
 * js-sdk 内部会自动对密码做 RSA 加密（与 H5 端完全一致的认证链路），
 * 而服务端直连 /auth/v1/signin 发送明文密码会被 CloudBase 拒绝（INVALID_USERNAME_OR_PASSWORD）。
 * 用 js-sdk 既能拿到正确 uid，又避免手搓加密的脆弱实现。
 */
let emailAuthApp = null;
try {
  const jsCloudbase = require("@cloudbase/js-sdk");
  emailAuthApp = jsCloudbase.init({ env: ENV_ID });
} catch (e) {
  console.warn("[email] 未加载 @cloudbase/js-sdk，邮箱登录暂不可用:", e.message);
}

function httpReq(hostname, path, method, body, authHeader) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { "Content-Type": "application/json" };
    if (authHeader) headers.Authorization = authHeader;
    if (data) headers["Content-Length"] = Buffer.byteLength(data);

    const req = https.request({ hostname, path, method, headers }, (res) => {
      let buf = "";
      res.on("data", (chunk) => (buf += chunk));
      res.on("end", () => {
        try {
          resolve({ statusCode: res.statusCode, ...JSON.parse(buf) });
        } catch (e) {
          resolve({ error: "解析响应失败", raw: buf.substring(0, 200), statusCode: res.statusCode });
        }
      });
    });
    req.on("error", (e) => resolve({ error: e.message }));
    if (data) req.write(data);
    req.end();
  });
}

function httpGet(hostname, path) {
  return new Promise((resolve) => {
    https
      .get({ hostname, path }, (res) => {
        let buf = "";
        res.on("data", (chunk) => (buf += chunk));
        res.on("end", () => {
          try { resolve(JSON.parse(buf)); }
          catch (e) { resolve({ error: "解析微信响应失败", raw: buf.substring(0, 200) }); }
        });
      })
      .on("error", (e) => resolve({ error: e.message }));
  });
}

/**
 * 从 CloudBase 返回的 access_token（JWT）解出用户 sub。
 * CloudBase 密码登录 / 自定义登录的响应体通常不直接带 sub，
 * js-sdk 正是通过解码 JWT payload 取得用户标识，这里对齐同一行为。
 * 失败返回空串（调用方再回退到响应体里的 sub/user_id/uid）。
 */
function decodeJwtSub(token) {
  if (!token || typeof token !== "string") return "";
  try {
    const parts = token.split(".");
    if (parts.length < 2) return "";
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    return claims.sub || claims.user_id || claims.uid || "";
  } catch (e) {
    return "";
  }
}

/** CloudBase Auth HTTP API base */
const AUTH_HOST = `${ENV_ID}.ap-shanghai.tcb-api.tencentcloudapi.com`;

// CloudBase Auth 的 Client ID 默认为环境 ID；Secret 从环境变量获取
const AUTH_CLIENT_ID = ENV_ID;
const AUTH_CLIENT_SECRET = process.env.CLOUDBASE_AUTH_SECRET || "";
// Basic Auth header
const AUTH_BASIC = AUTH_CLIENT_SECRET
  ? "Basic " + Buffer.from(`${AUTH_CLIENT_ID}:${AUTH_CLIENT_SECRET}`).toString("base64")
  : "";

// ==================== 内部工具：Postgres 执行 / 用户落地 ====================
async function runPg(sql) {
  const app = manager.init({ envId: ENV_ID });
  const db = typeof app.database === "function" ? app.database() : app.database;
  const result = await db.executePGSql({ Sql: sql });
  const columns = result?.Columns ?? [];
  const rawRows = result?.Rows ?? [];
  return rawRows.map((rowStr) => {
    const values = typeof rowStr === "string" ? JSON.parse(rowStr) : rowStr;
    const obj = {};
    columns.forEach((col, i) => { obj[col.toLowerCase()] = values[i]; });
    return obj;
  });
}

// SQL 字符串字面量转义（executePGSql 无参数绑定能力，只能插值，必须对不可信输入转义）
function pgStr(v) {
  if (v == null || v === "") return "NULL";
  return "'" + String(v).replace(/'/g, "''").replace(/\\/g, "\\\\").slice(0, 256) + "'";
}

// 登录成功后把身份落库到自有 users 表（email 分支带 email，wechat 分支带 openid）。
// id 即 CloudBase 用户管理里的 sub（可信，来自令牌 / 微信服务端返回）。
// 失败仅告警，不影响登录主流程。
async function ensureUser(uid, { email, openid, channel }) {
  const now = "extract(epoch from now())::bigint";
  const sql =
    `INSERT INTO users (id, email, wechat_openid, channel, created_at) VALUES (` +
    `${pgStr(uid)}, ${pgStr(email)}, ${pgStr(openid)}, ${pgStr(channel)}, ${now}) ` +
    `ON CONFLICT (id) DO UPDATE SET ` +
    `email = COALESCE(EXCLUDED.email, users.email), ` +
    `wechat_openid = COALESCE(EXCLUDED.wechat_openid, users.wechat_openid), ` +
    `channel = EXCLUDED.channel`;
  try {
    await runPg(sql);
  } catch (e) {
    console.warn("[ensureUser] upsert 失败(忽略):", e.message);
  }
}

exports.main = async (event) => {
  // 解析请求参数
  let params;
  if (event.body) {
    if (typeof event.body === "string") {
      try { params = JSON.parse(event.body); } catch (e) { params = {}; }
    } else {
      params = event.body;
    }
  } else {
    params = event;
  }

  const { action, email, password, wxCode } = params;

  // ==================== 数据库代理（pg） ====================
  // 前端经 /api/auth 调用，携带自建会话令牌 sessionToken；
  // 校验通过后由本云函数（服务端身份）执行 SQL，彻底绕开 CloudBase 用户令牌的 kid 兼容问题。
  if (action === "pg") {
    const token =
      params.sessionToken ||
      (event.headers &&
        (event.headers["x-session"] || event.headers["X-Session"]));
    const payload = verify(token);
    if (!payload) return { error: "未登录或会话已失效" };

    const sql = params.sql;
    if (!sql || typeof sql !== "string") return { error: "缺少 sql 参数" };

    // 可信 uid：取自会话令牌的 sub，即 CloudBase 用户管理里的用户 id，前端不可伪造。
    // 前端 SQL 中可用 {{uid}} 占位符，由服务端替换成当前登录用户的 uid，实现书库按用户隔离。
    const uid = payload && payload.sub ? String(payload.sub) : "";
    let finalSql = sql;
    if (uid && sql.includes("{{uid}}")) {
      if (!/^[A-Za-z0-9_.\-:@]{1,128}$/.test(uid)) {
        return { error: "非法用户标识" };
      }
      finalSql = sql.split("{{uid}}").join(uid);
    }

    try {
      const rows = await runPg(finalSql);
      return { rows };
    } catch (err) {
      console.error("[pg] 执行失败:", err.message, err.stack);
      return { error: err.message };
    }
  }

  // ==================== 邮箱登录 ====================
  if (action === "signInWithEmail" || (!action && params.username && params.password)) {
    const finalEmail = email || params.email || params.username;
    const finalPassword = password || params.password;
    if (!finalEmail || !finalPassword) return { error: "邮箱和密码不能为空" };

    // 使用 @cloudbase/js-sdk 完成「用户名密码登录」。
    // js-sdk 内部自动处理密码的 RSA 加密（与 H5 端同一链路）；服务端直连
    // /auth/v1/signin 发送明文密码会被 CloudBase 拒绝（INVALID_USERNAME_OR_PASSWORD）。
    if (!emailAuthApp) {
      return { error: "邮箱登录未初始化（缺少 @cloudbase/js-sdk 或环境配置）" };
    }
    try {
      const auth = emailAuthApp.auth();
      // 先登出，避免云函数容器复用时残留上一个调用者的会话
      try { await auth.signOut(); } catch (e) {}
      await auth.signInWithEmailAndPassword(finalEmail, finalPassword);
      const u = await auth.getUserInfo();
      const uid = u.uid || u.sub || u.user_id || "";
      if (!uid) {
        return { error: "登录成功但未能解析出用户标识(uid)，请检查 CloudBase 用户令牌" };
      }
      // 签发自建会话令牌（不把 CloudBase 用户令牌交到前端，规避网关 kid 不兼容）
      const accessToken = signSession(uid, "email");
      const refreshToken = signSession(uid, "email", "refresh");
      await ensureUser(uid, { email: finalEmail, openid: null, channel: "email" });
      return {
        uid,
        email: finalEmail,
        accessToken,
        refreshToken,
        user: { uid, email: finalEmail, channel: "email" },
      };
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      return { error: `CloudBase 邮箱登录失败: ${msg}` };
    }
  }

  // ==================== 微信登录（自定义 Ticket） ====================
  if (action === "signInWithWeChat") {
    if (!wxCode) return { error: "缺少微信 code" };
    if (!WX_APPID || !WX_SECRET) return { error: "未配置微信 AppID / Secret（请设置云函数环境变量）" };
    if (!ticketApp) return { error: "未配置自定义登录私钥 tcb_custom_login.json，请在 CloudBase 控制台开启自定义登录并下载私钥到本云函数目录" };

    // 1. code → openid（小程序 jscode2session，非开放平台 OAuth）
    const wxResult = await httpGet("api.weixin.qq.com",
      `/sns/jscode2session?appid=${WX_APPID}&secret=${WX_SECRET}&js_code=${wxCode}&grant_type=authorization_code`);
    if (wxResult.error || wxResult.errcode) {
      return { error: wxResult.error || wxResult.errmsg || `code2session 失败(${wxResult.errcode})` };
    }
    const { openid } = wxResult;
    if (!openid) return { error: "微信未返回 openid" };

    // 若该 openid 已绑定到某个邮箱账号，则本次登录「成为」该邮箱账号，共享其书库
    let linkedUid = null;
    try {
      const rows = await runPg(`SELECT id FROM users WHERE wechat_openid = ${pgStr(openid)}`);
      if (rows.length) linkedUid = rows[0].id;
    } catch (e) {
      console.warn("[wechat] 查微信绑定关系失败(忽略):", e.message);
    }

    console.log("[wechat] openid:", openid.substring(0, 8) + "...");

    // 2. 以 openid 作为 customUserId 签发自定义登录 ticket
    let ticket;
    try {
      ticket = await ticketApp.auth().createTicket(openid, { refresh: 7200 * 1000 });
    } catch (e) {
      console.error("[wechat] createTicket error:", e.message);
      return { error: `生成登录票据失败: ${e.message}` };
    }

    // 3. 用 ticket 走独立版 Auth 的自定义登录接口换取 access_token
    //    注意：独立版自定义登录专用端点是 /auth/v1/signin/custom，
    //    provider_token 是给「微信开放平台」OAuth 用的，不能套在这里。
    const signinResult = await httpReq(AUTH_HOST, "/auth/v1/signin/custom", "POST",
      { provider_id: "custom", ticket }, AUTH_BASIC);

    if (signinResult.error) {
      return { error: `登录失败: ${JSON.stringify(signinResult)}` };
    }

    if (!signinResult.access_token) {
      return {
        error: "Auth 自定义登录返回异常，缺少 access_token",
        _debug: JSON.stringify(signinResult).substring(0, 500),
      };
    }

    const uid = linkedUid || decodeJwtSub(signinResult.access_token) || signinResult.sub || signinResult.user_id || signinResult.uid || "";
    // 签发自建会话令牌（自定义登录令牌本身仅用于换取 uid，不交到前端）
    const accessToken = signSession(uid, "wechat");
    const refreshToken = signSession(uid, "wechat", "refresh");
    // 落地自有 users 表（wechat 渠道，带 openid）
    await ensureUser(uid, { email: null, openid, channel: "wechat" });
    return {
      uid,
      accessToken,
      refreshToken,
      user: { uid, channel: "wechat" },
    };
  }

  // ==================== 绑定微信（邮箱账号 → 关联 openid） ====================
  // 必须处于邮箱登录会话；把当前微信的 openid 写回邮箱账号行，
  // 之后微信登录即可解析为该邮箱账号 uid，共享同一书库。
  if (action === "bindWeChat") {
    const token =
      params.sessionToken ||
      (event.headers &&
        (event.headers["x-session"] || event.headers["X-Session"]));
    const payload = verify(token);
    if (!payload) return { error: "未登录或会话已失效" };
    const emailUid = payload && payload.sub ? String(payload.sub) : "";
    if (!emailUid) return { error: "会话无效" };
    if (!wxCode) return { error: "缺少微信 code" };
    if (!WX_APPID || !WX_SECRET) return { error: "未配置微信 AppID / Secret" };

    // 1. code → openid（小程序 jscode2session，服务端调用，openid 可信）
    const wxResult = await httpGet("api.weixin.qq.com",
      `/sns/jscode2session?appid=${WX_APPID}&secret=${WX_SECRET}&js_code=${wxCode}&grant_type=authorization_code`);
    if (wxResult.error || wxResult.errcode) {
      return { error: wxResult.error || wxResult.errmsg || `code2session 失败(${wxResult.errcode})` };
    }
    const openid = wxResult.openid;
    if (!openid) return { error: "微信未返回 openid" };

    // 2. 该 openid 是否已绑定？
    let exist = null;
    try {
      const rows = await runPg(`SELECT id, email FROM users WHERE wechat_openid = ${pgStr(openid)}`);
      if (rows.length) exist = rows[0];
    } catch (e) {
      console.warn("[bindWeChat] 查重失败(忽略):", e.message);
    }

    if (exist) {
      if (exist.id === emailUid) {
        return { ok: true, alreadyLinked: true };
      }
      if (exist.email) {
        return { error: "该微信已绑定其他邮箱账号" };
      }
      // 孤儿微信账号（之前未绑定就用过微信登录）：把其书库过户到邮箱账号后删除，再绑定
      try {
        await runPg(`UPDATE novels SET user_id = ${pgStr(emailUid)} WHERE user_id = ${pgStr(exist.id)}`);
        await runPg(`DELETE FROM users WHERE id = ${pgStr(exist.id)}`);
      } catch (e) {
        console.warn("[bindWeChat] 合并孤儿账号失败(忽略):", e.message);
      }
    }

    // 3. 把 openid 写回邮箱账号行
    try {
      await runPg(`UPDATE users SET wechat_openid = ${pgStr(openid)}, channel = 'email' WHERE id = ${pgStr(emailUid)}`);
    } catch (e) {
      console.error("[bindWeChat] 写回 openid 失败:", e.message);
      return { error: e.message };
    }
    return { ok: true };
  }

  return { error: `未知操作: ${action || "未指定"}` };
};
