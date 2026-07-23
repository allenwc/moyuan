/**
 * CloudBase PostgreSQL 代理云函数
 *
 * 前端通过 callFunction('pg', { sql }) 调用，
 * 返回 { rows: Row[] }，每行自动解析 JSON 并按列名转为对象。
 */

const cloudbase = require("@cloudbase/manager-node");

exports.main = async (event) => {
  const { sql } = event;
  if (!sql || typeof sql !== "string") {
    return { error: "缺少 sql 参数" };
  }

  try {
    const app = cloudbase.init({
      envId: event.envId || "moyuan-d5gab9aqm5759b176",
    });
    const result = await app.database.executePGSql({ Sql: sql });

    // executePGSql 返回格式:
    // { Columns: ["col1","col2"], Rows: ["[\"v1\",\"v2\"]", ...] }
    const columns = result?.Columns ?? [];
    const rawRows = result?.Rows ?? [];

    // 解析行数据：每行是 JSON 字符串，解析后按列名映射为对象
    const rows = rawRows.map((rowStr) => {
      const values = typeof rowStr === "string" ? JSON.parse(rowStr) : rowStr;
      const obj = {};
      columns.forEach((col, i) => {
        obj[col.toLowerCase()] = values[i];
      });
      return obj;
    });

    return { rows };
  } catch (err) {
    console.error("[pg] 执行失败:", err.message, err.stack);
    return { error: err.message };
  }
};
