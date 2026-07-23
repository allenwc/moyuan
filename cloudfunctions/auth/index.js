/**
 * 认证云函数 — 代理 CloudBase Auth 操作
 *
 * 支持 action:
 * - signInWithEmail: 邮箱密码登录
 */
const https = require("https");

const ENV_ID = process.env.TCB_ENV_ID || "moyuan-d5gab9aqm5759b176";

function httpPost(hostname, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let buf = "";
        res.on("data", (chunk) => (buf += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(buf));
          } catch (e) {
            resolve({ error: `解析响应失败: ${e.message}` });
          }
        });
      },
    );
    req.on("error", (e) => resolve({ error: e.message }));
    req.write(data);
    req.end();
  });
}

exports.main = async (event) => {
  const { action, email, password } = event;
  const envId = event.envId || ENV_ID;

  if (action === "signInWithEmail") {
    if (!email || !password) {
      return { error: "邮箱和密码不能为空" };
    }

    const hostname = `${envId}.service.tcloudbase.com`;
    const path = "/auth/v1/signin";

    const result = await httpPost(hostname, path, { email, password });

    if (result.error) {
      // CloudBase Auth HTTP API 返回的错误格式
      const msg =
        typeof result.error === "string" ? result.error : result.error?.message || "登录失败，请检查邮箱和密码";
      return { error: msg };
    }

    return {
      uid: result.user_id || result.uid || "",
      email: email,
      accessToken: result.access_token || "",
      refreshToken: result.refresh_token || "",
      user: {
        uid: result.user_id || result.uid || "",
        email: email,
        channel: "email",
      },
    };
  }

  return { error: `未知操作: ${action}` };
};
