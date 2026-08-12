const { createPgDb } = require("./db");

const db = createPgDb();

function generateApiKeySql() {
  return [
    "INSERT INTO api_keys (user_id, api_key, created_at, updated_at)",
    "VALUES (",
    "'{{uid}}',",
    "'mk_' || md5(random()::text || clock_timestamp()::text || '{{uid}}'),",
    "extract(epoch from now())::bigint,",
    "extract(epoch from now())::bigint",
    ")",
    "ON CONFLICT (user_id) DO UPDATE SET",
    "api_key = 'mk_' || md5(random()::text || clock_timestamp()::text || '{{uid}}'),",
    "updated_at = extract(epoch from now())::bigint",
    "RETURNING api_key",
  ].join(" ");
}

async function getApiKey() {
  const rows = await db.query(
    "SELECT api_key FROM api_keys WHERE user_id = '{{uid}}' LIMIT 1",
  );
  return rows[0] && rows[0].api_key ? String(rows[0].api_key) : "";
}

async function regenerateApiKey() {
  const rows = await db.query(generateApiKeySql());
  if (!rows[0] || !rows[0].api_key) {
    throw new Error("生成 API Key 失败");
  }
  return String(rows[0].api_key);
}

module.exports = {
  getApiKey,
  regenerateApiKey,
};
