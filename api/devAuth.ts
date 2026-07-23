import type { Db } from "./db";
import { lit } from "@moyuan/core";
import { issueSession } from "./authSession";

const DEV_USER_ID = "dev-user";
const DEV_USER_EMAIL = "dev@moyuan.local";

/** 开发旁路登录：签发固定 dev 用户的会话（仅当 MOYUAN_ALLOW_DEV_LOGIN=true）。 */
export async function issueDevBypassSession(
  db: Db,
): Promise<ReturnType<typeof issueSession>> {
  if (process.env.MOYUAN_ALLOW_DEV_LOGIN !== "true") {
    throw new Error("开发旁路登录未启用：设置 MOYUAN_ALLOW_DEV_LOGIN=true");
  }
  const existing = await db.query<{ id: unknown }>(
    `SELECT id FROM users WHERE id = ${lit(DEV_USER_ID)}`,
  );
  if (!existing.length) {
    await db.query(
      `INSERT INTO users (id, email, channel, created_at) VALUES (${lit(
        DEV_USER_ID,
      )}, ${lit(DEV_USER_EMAIL)}, ${lit("dev")}, ${lit(Date.now())})`,
    );
  }
  return issueSession(DEV_USER_ID, { email: DEV_USER_EMAIL, channel: "dev" });
}
