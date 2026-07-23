/**
 * CloudBase PostgreSQL 接入辅助。
 *
 * 服务端通过 @cloudbase/manager-node 的 `app.database.executePGSql({ Sql })` 执行原生 SQL，
 * 该接口不支持参数绑定，因此所有动态值都必须经过 `lit()` 转义，表名/列名经过 `ident()`
 * 转义，从根本上避免 SQL 注入。
 */

export interface Row {
  [key: string]: unknown;
}

/** 数据访问接口：由服务端（Vercel Hono）注入的 CloudBase PG 适配器实现。 */
export interface PgDb {
  /** 执行一条 SQL，返回解析后的行对象数组（列名统一小写）。 */
  query<T = Row>(sql: string): Promise<T[]>;
}

/** 安全转义标识符（表名 / 列名），按 SQL 标准双引号包裹并转义内部引号。 */
export function ident(name: string): string {
  return '"' + String(name).replace(/"/g, '""') + '"';
}

/** 安全转义字面值，防止 SQL 注入。 */
export function lit(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (value instanceof Date) return lit(value.getTime());
  return "'" + String(value).replace(/'/g, "''") + "'";
}

/** 生成 IN (...) 列表；调用方需保证 ids 非空（空列表请在外部处理）。 */
export function inList(ids: string[]): string {
  if (ids.length === 0) return "()";
  return "(" + ids.map((id) => lit(id)).join(", ") + ")";
}
