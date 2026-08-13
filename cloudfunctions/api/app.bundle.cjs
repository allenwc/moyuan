"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// cloudfunctions/api/src/app.ts
var app_exports = {};
__export(app_exports, {
  default: () => app_default
});
module.exports = __toCommonJS(app_exports);
var import_hono = require("hono");
var import_http_exception = require("hono/http-exception");

// cloudfunctions/api/src/db.ts
var import_manager_node = __toESM(require("@cloudbase/manager-node"));
var app = null;
function getApp() {
  if (!app) {
    const secretId = process.env.CLOUDBASE_SECRET_ID;
    const secretKey = process.env.CLOUDBASE_SECRET_KEY;
    const envId = process.env.CLOUDBASE_ENV_ID || process.env.TCB_ENV_ID || "";
    if (!envId) {
      throw new Error(
        "\u672A\u914D\u7F6E CloudBase \u73AF\u5883\uFF1ACLOUDBASE_ENV_ID\uFF08\u4E91\u51FD\u6570\u5185\u4F1A\u81EA\u52A8\u53D6 TCB_ENV_ID\uFF09"
      );
    }
    if (secretId && secretKey) {
      app = import_manager_node.default.init({ secretId, secretKey, envId });
    } else {
      app = import_manager_node.default.init({ envId });
    }
  }
  return app;
}
function getDb() {
  const app3 = getApp();
  return {
    async query(sql) {
      const res = await app3.database.executePGSql({ Sql: sql });
      const cols = (res.Columns ?? []).map((c) => c.toLowerCase());
      const rows = res.Rows ?? [];
      return rows.map((r) => {
        const vals = JSON.parse(r);
        const obj = {};
        cols.forEach((c, i) => {
          obj[c] = vals[i];
        });
        return obj;
      });
    }
  };
}

// packages/core/src/uid.ts
var counter = 0;
function uid(prefix = "id") {
  counter += 1;
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${t}_${r}_${counter.toString(36)}`;
}

// packages/core/src/sql.ts
function ident(name) {
  return '"' + String(name).replace(/"/g, '""') + '"';
}
function lit(value) {
  if (value === null || value === void 0) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (value instanceof Date) return lit(value.getTime());
  return "'" + String(value).replace(/'/g, "''") + "'";
}
function inList(ids) {
  if (ids.length === 0) return "()";
  return "(" + ids.map((id) => lit(id)).join(", ") + ")";
}

// packages/core/src/novelRepo.ts
function rowToNovel(r) {
  return {
    id: String(r.id),
    userId: r.user_id == null ? "" : String(r.user_id),
    title: String(r.title ?? ""),
    author: String(r.author ?? ""),
    synopsis: String(r.synopsis ?? ""),
    cover: r.cover == null ? void 0 : String(r.cover),
    themeColor: r.theme_color ?? "vermillion",
    createdAt: Number(r.created_at) || 0,
    updatedAt: Number(r.updated_at) || 0
  };
}
function rowToCharacter(r) {
  return {
    id: String(r.id),
    novelId: String(r.novel_id),
    name: String(r.name ?? "\u65E0\u540D\u6C0F"),
    alias: r.alias == null ? void 0 : String(r.alias),
    role: String(r.role ?? ""),
    faction: String(r.faction ?? ""),
    gender: r.gender ?? void 0,
    color: String(r.color ?? ""),
    note: String(r.note ?? ""),
    x: Number(r.x) || 0,
    y: Number(r.y) || 0,
    createdAt: Number(r.created_at) || 0
  };
}
function rowToRelation(r) {
  return {
    id: String(r.id),
    novelId: String(r.novel_id),
    sourceId: String(r.source_id),
    targetId: String(r.target_id),
    type: r.type ?? "other",
    direction: r.direction ?? "one-way",
    note: String(r.note ?? ""),
    createdAt: Number(r.created_at) || 0
  };
}
var NOVEL_COLS = [
  "id",
  "user_id",
  "title",
  "author",
  "synopsis",
  "cover",
  "theme_color",
  "created_at",
  "updated_at"
];
var CHARACTER_COLS = [
  "id",
  "novel_id",
  "name",
  "alias",
  "role",
  "faction",
  "gender",
  "color",
  "note",
  "x",
  "y",
  "created_at"
];
var RELATION_COLS = [
  "id",
  "novel_id",
  "source_id",
  "target_id",
  "type",
  "direction",
  "note",
  "created_at"
];
function novelRow(n) {
  return {
    id: n.id,
    user_id: n.userId,
    title: n.title,
    author: n.author,
    synopsis: n.synopsis,
    cover: n.cover ?? null,
    theme_color: n.themeColor,
    created_at: n.createdAt,
    updated_at: n.updatedAt
  };
}
function characterRow(c) {
  return {
    id: c.id,
    novel_id: c.novelId,
    name: c.name,
    alias: c.alias ?? null,
    role: c.role,
    faction: c.faction,
    gender: c.gender ?? null,
    color: c.color,
    note: c.note,
    x: c.x,
    y: c.y,
    created_at: c.createdAt
  };
}
function relationRow(r) {
  return {
    id: r.id,
    novel_id: r.novelId,
    source_id: r.sourceId,
    target_id: r.targetId,
    type: r.type,
    direction: r.direction,
    note: r.note,
    created_at: r.createdAt
  };
}
function insertSql(table, cols, rows) {
  const colList = cols.map((c) => ident(c)).join(", ");
  const valueRows = rows.map((row) => "(" + cols.map((c) => lit(row[c])).join(", ") + ")").join(", ");
  const updateCols = cols.filter((c) => c !== "id").map((c) => `${ident(c)} = EXCLUDED.${ident(c)}`).join(", ");
  return `INSERT INTO ${ident(table)} (${colList}) VALUES ${valueRows} ON CONFLICT (${ident(
    "id"
  )}) DO UPDATE SET ${updateCols}`;
}
async function fetchAll(db, opts = {}) {
  let sql = "SELECT * FROM " + ident("novels");
  if (opts.userId) sql += ` WHERE ${ident("user_id")} = ${lit(opts.userId)}`;
  sql += ` ORDER BY ${ident("updated_at")} DESC`;
  const novels = (await db.query(sql)).map(rowToNovel);
  if (novels.length === 0) return { novels: [], characters: [], relations: [] };
  const ids = novels.map((n) => n.id);
  const [characters, relations] = await Promise.all([
    db.query(
      `SELECT * FROM ${ident("characters")} WHERE ${ident("novel_id")} IN ${inList(ids)}`
    ),
    db.query(
      `SELECT * FROM ${ident("relations")} WHERE ${ident("novel_id")} IN ${inList(ids)}`
    )
  ]);
  return {
    novels,
    characters: characters.map(rowToCharacter),
    relations: relations.map(rowToRelation)
  };
}
async function listNovels(db, opts = {}) {
  let sql = "SELECT * FROM " + ident("novels");
  if (opts.userId) sql += ` WHERE ${ident("user_id")} = ${lit(opts.userId)}`;
  sql += ` ORDER BY ${ident("updated_at")} DESC`;
  return (await db.query(sql)).map(rowToNovel);
}
async function fetchGraph(db, novelId) {
  const rows = await db.query(
    `SELECT * FROM ${ident("novels")} WHERE ${ident("id")} = ${lit(novelId)}`
  );
  if (rows.length === 0) return null;
  const [characters, relations] = await Promise.all([
    db.query(
      `SELECT * FROM ${ident("characters")} WHERE ${ident("novel_id")} = ${lit(novelId)}`
    ),
    db.query(
      `SELECT * FROM ${ident("relations")} WHERE ${ident("novel_id")} = ${lit(novelId)}`
    )
  ]);
  return {
    novel: rowToNovel(rows[0]),
    characters: characters.map(rowToCharacter),
    relations: relations.map(rowToRelation)
  };
}
async function getCharacter(db, id) {
  const rows = await db.query(
    `SELECT * FROM ${ident("characters")} WHERE ${ident("id")} = ${lit(id)}`
  );
  return rows.length ? rowToCharacter(rows[0]) : null;
}
async function getRelation(db, id) {
  const rows = await db.query(
    `SELECT * FROM ${ident("relations")} WHERE ${ident("id")} = ${lit(id)}`
  );
  return rows.length ? rowToRelation(rows[0]) : null;
}
async function createNovel(db, input, opts) {
  const now = Date.now();
  const novel = {
    id: uid("novel"),
    userId: opts.userId,
    title: input.title.trim() || "\u672A\u547D\u540D",
    author: (input.author ?? "").trim(),
    synopsis: (input.synopsis ?? "").trim(),
    cover: input.cover?.trim() || void 0,
    themeColor: input.themeColor ?? "vermillion",
    createdAt: now,
    updatedAt: now
  };
  await db.query(insertSql("novels", NOVEL_COLS, [novelRow(novel)]));
  return novel;
}
async function updateNovel(db, id, patch) {
  const sets = [];
  if (patch.title !== void 0)
    sets.push(`${ident("title")} = ${lit(patch.title.trim() || "\u672A\u547D\u540D")}`);
  if (patch.author !== void 0)
    sets.push(`${ident("author")} = ${lit(patch.author.trim())}`);
  if (patch.synopsis !== void 0)
    sets.push(`${ident("synopsis")} = ${lit(patch.synopsis.trim())}`);
  if (patch.cover !== void 0)
    sets.push(`${ident("cover")} = ${lit(patch.cover.trim() || null)}`);
  if (patch.themeColor !== void 0)
    sets.push(`${ident("theme_color")} = ${lit(patch.themeColor)}`);
  sets.push(`${ident("updated_at")} = ${lit(Date.now())}`);
  if (sets.length === 0) return;
  await db.query(
    `UPDATE ${ident("novels")} SET ${sets.join(", ")} WHERE ${ident("id")} = ${lit(id)}`
  );
}
async function deleteNovel(db, novelId) {
  await db.query(
    `DELETE FROM ${ident("relations")} WHERE ${ident("novel_id")} = ${lit(novelId)}`
  );
  await db.query(
    `DELETE FROM ${ident("characters")} WHERE ${ident("novel_id")} = ${lit(novelId)}`
  );
  await db.query(
    `DELETE FROM ${ident("novels")} WHERE ${ident("id")} = ${lit(novelId)}`
  );
}
async function addCharacter(db, novelId, input) {
  const character = {
    id: uid("char"),
    novelId,
    name: input.name.trim() || "\u65E0\u540D\u6C0F",
    alias: input.alias?.trim() || void 0,
    role: input.role,
    faction: input.faction,
    gender: input.gender,
    color: input.color,
    note: input.note,
    x: input.x,
    y: input.y,
    createdAt: Date.now()
  };
  await db.query(insertSql("characters", CHARACTER_COLS, [characterRow(character)]));
  return character;
}
async function updateCharacter(db, id, patch) {
  const sets = [];
  if (patch.name !== void 0)
    sets.push(`${ident("name")} = ${lit(patch.name.trim() || "\u65E0\u540D\u6C0F")}`);
  if (patch.alias !== void 0)
    sets.push(`${ident("alias")} = ${lit(patch.alias?.trim() || null)}`);
  if (patch.role !== void 0) sets.push(`${ident("role")} = ${lit(patch.role)}`);
  if (patch.faction !== void 0)
    sets.push(`${ident("faction")} = ${lit(patch.faction)}`);
  if (patch.gender !== void 0)
    sets.push(`${ident("gender")} = ${lit(patch.gender ?? null)}`);
  if (patch.color !== void 0) sets.push(`${ident("color")} = ${lit(patch.color)}`);
  if (patch.note !== void 0) sets.push(`${ident("note")} = ${lit(patch.note)}`);
  if (patch.x !== void 0) sets.push(`${ident("x")} = ${lit(patch.x)}`);
  if (patch.y !== void 0) sets.push(`${ident("y")} = ${lit(patch.y)}`);
  if (sets.length === 0) return;
  await db.query(
    `UPDATE ${ident("characters")} SET ${sets.join(", ")} WHERE ${ident("id")} = ${lit(id)}`
  );
}
async function removeCharacter(db, novelId, id) {
  await db.query(
    `DELETE FROM ${ident("relations")} WHERE ${ident("novel_id")} = ${lit(
      novelId
    )} AND (${ident("source_id")} = ${lit(id)} OR ${ident("target_id")} = ${lit(id)})`
  );
  await db.query(
    `DELETE FROM ${ident("characters")} WHERE ${ident("novel_id")} = ${lit(
      novelId
    )} AND ${ident("id")} = ${lit(id)}`
  );
}
async function addRelation(db, novelId, input) {
  const relation = {
    id: uid("rel"),
    novelId,
    sourceId: input.sourceId,
    targetId: input.targetId,
    type: input.type,
    direction: input.direction,
    note: input.note,
    createdAt: Date.now()
  };
  await db.query(insertSql("relations", RELATION_COLS, [relationRow(relation)]));
  return relation;
}
async function updateRelation(db, id, patch) {
  const sets = [];
  if (patch.sourceId !== void 0)
    sets.push(`${ident("source_id")} = ${lit(patch.sourceId)}`);
  if (patch.targetId !== void 0)
    sets.push(`${ident("target_id")} = ${lit(patch.targetId)}`);
  if (patch.type !== void 0) sets.push(`${ident("type")} = ${lit(patch.type)}`);
  if (patch.direction !== void 0)
    sets.push(`${ident("direction")} = ${lit(patch.direction)}`);
  if (patch.note !== void 0) sets.push(`${ident("note")} = ${lit(patch.note)}`);
  if (sets.length === 0) return;
  await db.query(
    `UPDATE ${ident("relations")} SET ${sets.join(", ")} WHERE ${ident("id")} = ${lit(id)}`
  );
}
async function reconcileNovel(db, novel, characters, relations) {
  novel.updatedAt = Date.now();
  await db.query(insertSql("novels", NOVEL_COLS, [novelRow(novel)]));
  const keepCharIds = characters.map((c) => c.id);
  if (characters.length > 0) {
    await db.query(
      insertSql("characters", CHARACTER_COLS, characters.map(characterRow))
    );
  }
  let delChars = `DELETE FROM ${ident("characters")} WHERE ${ident("novel_id")} = ${lit(
    novel.id
  )}`;
  if (keepCharIds.length > 0)
    delChars += ` AND ${ident("id")} NOT IN ${inList(keepCharIds)}`;
  await db.query(delChars);
  const keepRelIds = relations.map((r) => r.id);
  if (relations.length > 0) {
    await db.query(
      insertSql("relations", RELATION_COLS, relations.map(relationRow))
    );
  }
  let delRels = `DELETE FROM ${ident("relations")} WHERE ${ident("novel_id")} = ${lit(
    novel.id
  )}`;
  if (keepRelIds.length > 0)
    delRels += ` AND ${ident("id")} NOT IN ${inList(keepRelIds)}`;
  await db.query(delRels);
  return { novel, characters, relations };
}

// cloudfunctions/api/src/authJwt.ts
var import_jsonwebtoken = __toESM(require("jsonwebtoken"));
var SECRET = process.env.MOYUAN_JWT_SECRET || "dev-insecure-secret-change-me";
function signSession(userId) {
  return import_jsonwebtoken.default.sign({ sub: userId }, SECRET, { expiresIn: "365d" });
}
function verifyJwt(token) {
  try {
    const payload = import_jsonwebtoken.default.verify(token, SECRET);
    return payload.sub ? { sub: payload.sub } : null;
  } catch {
    return null;
  }
}

// cloudfunctions/api/src/authSession.ts
function issueSession(userId, user) {
  return {
    accessToken: signSession(userId),
    user: { id: userId, ...user }
  };
}

// cloudfunctions/api/src/wechatAuth.ts
var WX_APPID = process.env.WECHAT_APPID || "";
var WX_SECRET = process.env.WECHAT_SECRET || "";
async function exchangeMiniCode(code) {
  if (!WX_APPID || !WX_SECRET) throw new Error("\u672A\u914D\u7F6E\u5FAE\u4FE1 AppId / Secret");
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${WX_APPID}&secret=${WX_SECRET}&js_code=${code}&grant_type=authorization_code`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.openid) throw new Error(data.errmsg || "\u5FAE\u4FE1\u767B\u5F55\u5931\u8D25");
  return data;
}
async function exchangeWebCode(code) {
  if (!WX_APPID || !WX_SECRET) throw new Error("\u672A\u914D\u7F6E\u5FAE\u4FE1 AppId / Secret");
  const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WX_APPID}&secret=${WX_SECRET}&code=${code}&grant_type=authorization_code`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.openid) throw new Error(data.errmsg || "\u5FAE\u4FE1\u7F51\u9875\u6388\u6743\u5931\u8D25");
  return data;
}
function buildWebAuthorizeUrl(redirectUri) {
  const encoded = encodeURIComponent(redirectUri);
  return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${WX_APPID}&redirect_uri=${encoded}&response_type=code&scope=snsapi_base&state=moyuan#wechat_redirect`;
}
async function ensureUser(db, identity) {
  const stableKey = identity.unionid || `${identity.channel}:${identity.openid}`;
  const existing = await db.query(
    `SELECT id FROM users WHERE wechat_stable_key = ${lit(stableKey)}`
  );
  if (existing.length) return String(existing[0].id);
  const id = uid("user");
  await db.query(
    `INSERT INTO users (id, wechat_openid, wechat_unionid, wechat_stable_key, channel, created_at) VALUES (${lit(
      id
    )}, ${lit(identity.openid)}, ${lit(identity.unionid ?? null)}, ${lit(
      stableKey
    )}, ${lit(identity.channel)}, ${lit(Date.now())})`
  );
  return id;
}
async function loginMiniWithCode(db, code) {
  const wx = await exchangeMiniCode(code);
  const userId = await ensureUser(db, {
    openid: wx.openid,
    unionid: wx.unionid,
    channel: "mini"
  });
  return issueSession(userId, { channel: "mini" });
}
async function loginWebWithCode(db, code) {
  const wx = await exchangeWebCode(code);
  const userId = await ensureUser(db, {
    openid: wx.openid,
    unionid: wx.unionid,
    channel: "web"
  });
  return issueSession(userId, { channel: "web" });
}

// cloudfunctions/api/src/devAuth.ts
var DEV_USER_ID = "dev-user";
var DEV_USER_EMAIL = "dev@moyuan.local";
async function issueDevBypassSession(db) {
  if (process.env.MOYUAN_ALLOW_DEV_LOGIN !== "true") {
    throw new Error("\u5F00\u53D1\u65C1\u8DEF\u767B\u5F55\u672A\u542F\u7528\uFF1A\u8BBE\u7F6E MOYUAN_ALLOW_DEV_LOGIN=true");
  }
  const existing = await db.query(
    `SELECT id FROM users WHERE id = ${lit(DEV_USER_ID)}`
  );
  if (!existing.length) {
    await db.query(
      `INSERT INTO users (id, email, channel, created_at) VALUES (${lit(
        DEV_USER_ID
      )}, ${lit(DEV_USER_EMAIL)}, ${lit("dev")}, ${lit(Date.now())})`
    );
  }
  return issueSession(DEV_USER_ID, { email: DEV_USER_EMAIL, channel: "dev" });
}

// cloudfunctions/api/src/authCrypto.ts
var import_node_crypto = require("node:crypto");
function hashPassword(password) {
  const salt = (0, import_node_crypto.randomBytes)(16).toString("hex");
  const derived = (0, import_node_crypto.scryptSync)(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}
function verifyPassword(password, stored) {
  const parts = stored.split(":");
  if (parts.length !== 2) return false;
  const [salt, derived] = parts;
  const d = (0, import_node_crypto.scryptSync)(password, salt, 64);
  const expected = Buffer.from(derived, "hex");
  return d.length === expected.length && (0, import_node_crypto.timingSafeEqual)(d, expected);
}

// cloudfunctions/api/src/emailAuth.ts
async function loginWithEmailPassword(db, email, password) {
  const rows = await db.query(
    `SELECT id, password_hash FROM users WHERE email = ${lit(email)}`
  );
  if (rows.length === 0) {
    const id = uid("user");
    await db.query(
      `INSERT INTO users (id, email, password_hash, channel, created_at) VALUES (${lit(
        id
      )}, ${lit(email)}, ${lit(hashPassword(password))}, ${lit("email")}, ${lit(
        Date.now()
      )})`
    );
    return issueSession(id, { email });
  }
  const hash = rows[0].password_hash;
  if (!hash || !verifyPassword(password, String(hash))) {
    throw new Error("\u90AE\u7BB1\u6216\u5BC6\u7801\u9519\u8BEF");
  }
  return issueSession(String(rows[0].id), { email });
}

// cloudfunctions/api/src/app.ts
async function resolveAuth(c, db) {
  const auth = c.req.header("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token) {
    const keyRows = await db.query(
      `SELECT user_id FROM api_keys WHERE api_key = ${lit(token)} LIMIT 1`
    );
    if (keyRows.length > 0) {
      return { mode: "api_key", userId: String(keyRows[0].user_id) };
    }
  }
  if (token) {
    const payload = verifyJwt(token);
    if (payload?.sub) return { mode: "user", userId: payload.sub };
  }
  throw new import_http_exception.HTTPException(401, { message: "\u672A\u6388\u6743\uFF1A\u7F3A\u5C11\u6709\u6548\u4EE4\u724C" });
}
function scopeUserId(auth, c) {
  if (auth.userId) return auth.userId;
  if (auth.mode === "user") return auth.userId;
  return new URL(c.req.url).searchParams.get("userId");
}
function requireWriteUserId(auth) {
  const uid2 = auth.userId;
  if (!uid2) throw new import_http_exception.HTTPException(401, { message: "\u672A\u6388\u6743" });
  return uid2;
}
async function lookupNovelOwner(db, novelId) {
  const rows = await db.query(
    `SELECT user_id FROM novels WHERE id = ${lit(novelId)} LIMIT 1`
  );
  return rows.length > 0 ? String(rows[0].user_id) : null;
}
async function assertNovelAccess(db, auth, novelId) {
  const ownerId = await lookupNovelOwner(db, novelId);
  if (!ownerId || ownerId !== auth.userId) {
    throw new import_http_exception.HTTPException(404, { message: "\u5C0F\u8BF4\u4E0D\u5B58\u5728\u6216\u65E0\u6743\u8BBF\u95EE" });
  }
}
var app2 = new import_hono.Hono();
app2.onError((err, c) => {
  if (err instanceof import_http_exception.HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error("[api] \u672A\u5904\u7406\u5F02\u5E38:", err);
  return c.json({ error: "\u670D\u52A1\u5668\u5185\u90E8\u9519\u8BEF" }, 500);
});
app2.get(
  "/health",
  (c) => c.json({ ok: true, service: "moyuan-api", ts: Date.now() })
);
app2.get("/novels", async (c) => {
  const db = getDb();
  const auth = await resolveAuth(c, db);
  const userId = scopeUserId(auth, c);
  if (auth.mode === "user" && !userId)
    throw new import_http_exception.HTTPException(401, { message: "\u7528\u6237\u8EAB\u4EFD\u7F3A\u5931" });
  const novels = await listNovels(db, { userId });
  return c.json({ novels });
});
app2.get("/novels/snapshot", async (c) => {
  const db = getDb();
  const auth = await resolveAuth(c, db);
  const userId = scopeUserId(auth, c);
  if (auth.mode === "user" && !userId)
    throw new import_http_exception.HTTPException(401, { message: "\u7528\u6237\u8EAB\u4EFD\u7F3A\u5931" });
  const snap = await fetchAll(db, { userId });
  return c.json(snap);
});
app2.post("/novels", async (c) => {
  const db = getDb();
  const auth = await resolveAuth(c, db);
  const userId = requireWriteUserId(auth);
  const body = await c.req.json();
  const novel = await createNovel(
    db,
    {
      title: body.title ?? "",
      author: body.author,
      synopsis: body.synopsis,
      cover: body.cover,
      themeColor: body.themeColor
    },
    { userId }
  );
  return c.json({ novel }, 201);
});
app2.get("/novels/:id", async (c) => {
  const db = getDb();
  const auth = await resolveAuth(c, db);
  const novelId = c.req.param("id");
  await assertNovelAccess(db, auth, novelId);
  const graph = await fetchGraph(db, novelId);
  if (!graph) throw new import_http_exception.HTTPException(404, { message: "\u5C0F\u8BF4\u4E0D\u5B58\u5728" });
  return c.json(graph);
});
app2.put("/novels/:id", async (c) => {
  const db = getDb();
  const auth = await resolveAuth(c, db);
  const novelId = c.req.param("id");
  await assertNovelAccess(db, auth, novelId);
  const body = await c.req.json();
  await updateNovel(db, novelId, body);
  const graph = await fetchGraph(db, novelId);
  return c.json(graph);
});
app2.delete("/novels/:id", async (c) => {
  const db = getDb();
  const auth = await resolveAuth(c, db);
  const novelId = c.req.param("id");
  await assertNovelAccess(db, auth, novelId);
  await deleteNovel(db, novelId);
  return c.body(null, 204);
});
app2.post("/novels/:id/reconcile", async (c) => {
  const db = getDb();
  const auth = await resolveAuth(c, db);
  const novelId = c.req.param("id");
  const ownerId = await lookupNovelOwner(db, novelId);
  if (ownerId && ownerId !== auth.userId) {
    throw new import_http_exception.HTTPException(404, { message: "\u5C0F\u8BF4\u4E0D\u5B58\u5728\u6216\u65E0\u6743\u8BBF\u95EE" });
  }
  const body = await c.req.json();
  if (!body.novel) throw new import_http_exception.HTTPException(400, { message: "\u7F3A\u5C11 novel" });
  body.novel.userId = requireWriteUserId(auth);
  body.novel.id = novelId;
  const graph = await reconcileNovel(
    db,
    body.novel,
    body.characters ?? [],
    body.relations ?? []
  );
  return c.json(graph);
});
app2.post("/novels/:id/characters", async (c) => {
  const db = getDb();
  const auth = await resolveAuth(c, db);
  const novelId = c.req.param("id");
  await assertNovelAccess(db, auth, novelId);
  const body = await c.req.json();
  const character = await addCharacter(db, novelId, body);
  return c.json({ character }, 201);
});
app2.put("/novels/:id/characters/:charId", async (c) => {
  const db = getDb();
  const auth = await resolveAuth(c, db);
  const novelId = c.req.param("id");
  const charId = c.req.param("charId");
  await assertNovelAccess(db, auth, novelId);
  const body = await c.req.json();
  await updateCharacter(db, charId, body);
  const character = await getCharacter(db, charId);
  return c.json({ character });
});
app2.delete("/novels/:id/characters/:charId", async (c) => {
  const db = getDb();
  const auth = await resolveAuth(c, db);
  const novelId = c.req.param("id");
  const charId = c.req.param("charId");
  await assertNovelAccess(db, auth, novelId);
  await removeCharacter(db, novelId, charId);
  return c.json({ characters: [], relations: [] });
});
app2.post("/novels/:id/relations", async (c) => {
  const db = getDb();
  const auth = await resolveAuth(c, db);
  const novelId = c.req.param("id");
  await assertNovelAccess(db, auth, novelId);
  const body = await c.req.json();
  const relation = await addRelation(db, novelId, body);
  return c.json({ relation }, 201);
});
app2.put("/novels/:id/relations/:relId", async (c) => {
  const db = getDb();
  const auth = await resolveAuth(c, db);
  const novelId = c.req.param("id");
  const relId = c.req.param("relId");
  await assertNovelAccess(db, auth, novelId);
  const body = await c.req.json();
  await updateRelation(db, relId, body);
  const relation = await getRelation(db, relId);
  return c.json({ relation });
});
app2.delete("/novels/:id/relations/:relId", async (c) => {
  const db = getDb();
  const auth = await resolveAuth(c, db);
  const novelId = c.req.param("id");
  const relId = c.req.param("relId");
  await assertNovelAccess(db, auth, novelId);
  await db.query(
    `DELETE FROM ${ident("relations")} WHERE ${ident("id")} = ${lit(relId)}`
  );
  return c.json({ relations: [] });
});
app2.get("/auth/wechat/web/authorize-url", async (c) => {
  const redirectUri = c.req.query("redirect_uri") || "";
  if (!redirectUri) return c.json({ error: "\u7F3A\u5C11 redirect_uri" }, 400);
  const url = buildWebAuthorizeUrl(redirectUri);
  return c.json({ authorizeUrl: url });
});
app2.post("/auth/wechat/mini", async (c) => {
  const { code } = await c.req.json();
  if (!code) return c.json({ error: "\u7F3A\u5C11 code" }, 400);
  const session = await loginMiniWithCode(getDb(), code);
  return c.json({ session });
});
app2.post("/auth/wechat/web", async (c) => {
  const { code } = await c.req.json();
  if (!code) return c.json({ error: "\u7F3A\u5C11 code" }, 400);
  const session = await loginWebWithCode(getDb(), code);
  return c.json({ session });
});
app2.post("/auth/dev-login", async (c) => {
  const session = await issueDevBypassSession(getDb());
  return c.json({ session });
});
app2.post("/auth/login", async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password)
    return c.json({ error: "\u7F3A\u5C11\u90AE\u7BB1\u6216\u5BC6\u7801" }, 400);
  const session = await loginWithEmailPassword(getDb(), email, password);
  return c.json({ session });
});
var app_default = app2;
