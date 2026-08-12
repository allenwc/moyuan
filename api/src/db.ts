import CloudBase from "@cloudbase/manager-node";

// 用 any 规避 SDK 类型差异：executePGSql 返回的 Rows 为按列对齐的 JSON 字符串数组。
let app: any = null;

function getApp(): any {
  if (!app) {
    const secretId = process.env.CLOUDBASE_SECRET_ID;
    const secretKey = process.env.CLOUDBASE_SECRET_KEY;
    const envId = process.env.CLOUDBASE_ENV_ID;
    if (!secretId || !secretKey || !envId) {
      throw new Error(
        "未配置 CloudBase 凭据：CLOUDBASE_SECRET_ID / CLOUDBASE_SECRET_KEY / CLOUDBASE_ENV_ID",
      );
    }
    app = CloudBase.init({ secretId, secretKey, envId });
  }
  return app;
}

export interface DbRow {
  [key: string]: unknown;
}

export interface Db {
  /** 执行一条 SQL，返回解析后的行对象数组（列名统一小写）。 */
  query<T = DbRow>(sql: string): Promise<T[]>;
}

/**
 * 返回 CloudBase PostgreSQL 适配器。
 * 通过 @cloudbase/manager-node 的 `app.database.executePGSql` 执行原生 SQL，
 * 该接口返回 `Rows`（按列对齐的 JSON 字符串数组）+ `Columns`，这里解析成对象数组。
 */
export function getDb(): Db {
  const app = getApp();
  return {
    async query<T = DbRow>(sql: string): Promise<T[]> {
      const res = await app.database.executePGSql({ Sql: sql });
      const cols = (res.Columns ?? []).map((c: string) => c.toLowerCase());
      const rows = res.Rows ?? [];
      return rows.map((r: string) => {
        const vals = JSON.parse(r) as unknown[];
        const obj: Record<string, unknown> = {};
        cols.forEach((c: string, i: number) => {
          obj[c] = vals[i];
        });
        return obj as T;
      });
    },
  };
}
