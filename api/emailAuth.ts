import type { Db } from "./db";
import { lit, uid } from "@moyuan/core";
import { issueSession } from "./authSession";
import { hashPassword, verifyPassword } from "./authCrypto";

/**
 * 邮箱 + 密码登录。
 * - 用户不存在时自动注册（首登即创建），密码以 scrypt 哈希存储。
 * - 用户存在时校验密码哈希。
 */
export async function loginWithEmailPassword(
  db: Db,
  email: string,
  password: string,
): Promise<ReturnType<typeof issueSession>> {
  const rows = await db.query<{ id: unknown; password_hash: unknown }>(
    `SELECT id, password_hash FROM users WHERE email = ${lit(email)}`,
  );
  if (rows.length === 0) {
    const id = uid("user");
    await db.query(
      `INSERT INTO users (id, email, password_hash, channel, created_at) VALUES (${lit(
        id,
      )}, ${lit(email)}, ${lit(hashPassword(password))}, ${lit("email")}, ${lit(
        Date.now(),
      )})`,
    );
    return issueSession(id, { email });
  }
  const hash = rows[0].password_hash;
  if (!hash || !verifyPassword(password, String(hash))) {
    throw new Error("邮箱或密码错误");
  }
  return issueSession(String(rows[0].id), { email });
}
