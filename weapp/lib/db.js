/**
 * PgDb via CloudBase HTTP callFunction('pg') — 与 @moyuan/cloudbase 契约一致。
 */
const { callFunction } = require("./http");

function createPgDb() {
  return {
    async query(sql) {
      const data = await callFunction("pg", { sql });
      // 网关可能直接返回函数结果，或包一层 result
      const payload = data && data.result != null ? data.result : data;
      if (payload && payload.error) {
        throw new Error(`[PG] ${payload.error}`);
      }
      return (payload && payload.rows) || [];
    },
  };
}

module.exports = { createPgDb };
