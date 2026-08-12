import { getPgDb } from "@/lib/cloudbase";

function sqlStr(value: string): string {
  return "'" + value.replace(/'/g, "''") + "'";
}

function extractApiKey(row: Record<string, unknown> | undefined | null): string {
  if (!row) return "";
  const v =
    row.api_key ??
    // 兼容云函数或驱动把列名驼峰化/大小写变化的情况
    (row as any).apiKey ??
    // 兜底：取第一列值（RETURNING 可能导致列名不是 api_key）
    Object.values(row)[0];
  return v == null ? "" : String(v);
}

export async function getApiKey(userId: string): Promise<string> {
  const rows = await getPgDb().query<{ api_key?: unknown }>(
    `SELECT api_key FROM api_keys WHERE user_id = ${sqlStr(userId)} LIMIT 1`,
  );
  return extractApiKey(rows[0] as any);
}

export async function regenerateApiKey(userId: string): Promise<string> {
  const rows = await getPgDb().query<{ api_key?: unknown }>(
    [
      "INSERT INTO api_keys (user_id, api_key, created_at, updated_at)",
      `VALUES (${sqlStr(userId)}, 'mk_' || md5(random()::text || clock_timestamp()::text || ${sqlStr(userId)}), extract(epoch from now())::bigint, extract(epoch from now())::bigint)`,
      "ON CONFLICT (user_id) DO UPDATE SET",
      `api_key = 'mk_' || md5(random()::text || clock_timestamp()::text || ${sqlStr(userId)}),`,
      "updated_at = extract(epoch from now())::bigint",
      "RETURNING api_key",
    ].join(" "),
  );
  const apiKey = extractApiKey(rows[0] as any);
  if (!apiKey) {
    const keys = rows[0] ? Object.keys(rows[0]).join(",") : "";
    throw new Error(`生成 API Key 失败（返回列: ${keys || "empty"}）`);
  }
  return apiKey;
}
