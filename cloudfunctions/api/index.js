/**
 * 墨缘开放 API — CloudBase HTTP 触发云函数入口。
 *
 * app.bundle.cjs 由 scripts/build-cloud-api.mjs 从 api/src/app.ts 打包生成
 * （内含 @moyuan/core，hono/@cloudbase/manager-node/jsonwebtoken 保持 external，
 *  由云端 installDependency 安装）。
 *
 * 部署：
 *   1) node scripts/build-cloud-api.mjs     # 生成 app.bundle.cjs
 *   2) tcb fn deploy api                    # 上传部署
 *   3) 控制台「云函数 → HTTP 访问服务」绑定路径 /api/* → 本函数
 *   最终访问：https://<域名>/api/...（CLI 设 MOYUAN_API_URL=https://<域名>/api）
 */
const app = require("./app.bundle.cjs").default;

/** 把 event.path 里的 /api 前缀去掉，交给 Hono 路由（路由本身以 /novels 等开头）。 */
function normalizePath(rawPath) {
  let p = rawPath || "/";
  if (p.startsWith("/api")) p = p.slice(4) || "/";
  return p;
}

exports.main = async (event) => {
  try {
    // 诊断日志（低音量，便于排障）
    console.log(
      "[api]", event.httpMethod, event.path,
      "| body=", typeof event.body === "string" ? event.body.slice(0, 80) : typeof event.body,
    );

    const query = event.queryStringParameters || {};
    const qs = new URLSearchParams(query).toString();
    const url = normalizePath(event.path) + (qs ? `?${qs}` : "");

    // 只透传字符串值头，避免非法 header 导致 Request 构造抛错
    const headers = {};
    for (const [k, v] of Object.entries(event.headers || {})) {
      if (typeof v === "string") headers[k] = v;
    }
    const method = (event.httpMethod || "GET").toUpperCase();
    let body;
    const bodyless = method === "GET" || method === "HEAD";
    if (!bodyless && event.body != null) {
      body = event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString("utf8")
        : typeof event.body === "string"
          ? event.body
          : JSON.stringify(event.body);
    }

    const res = await app.request(url, {
      method,
      headers,
      body: body !== undefined ? body : undefined,
    });

    const resBody = Buffer.from(await res.arrayBuffer());
    const respHeaders = {};
    res.headers.forEach((v, k) => {
      respHeaders[k] = v;
    });

    return {
      statusCode: res.status,
      headers: respHeaders,
      body: resBody.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error("[api] 未处理异常:", err);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: Buffer.from(
        JSON.stringify({
          error: "服务器内部错误",
          detail: String(err && err.message),
          event: {
            keys: Object.keys(event || {}),
            path: event && event.path,
            method: event && event.httpMethod,
          },
        }),
      ).toString("base64"),
      isBase64Encoded: true,
    };
  }
};
