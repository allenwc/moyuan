import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

/** 使用 scrypt 派生密码哈希，返回 `salt:derived`（hex）。 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

/** 校验明文密码与存储哈希是否匹配。 */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 2) return false;
  const [salt, derived] = parts;
  const d = scryptSync(password, salt, 64);
  const expected = Buffer.from(derived, "hex");
  return d.length === expected.length && timingSafeEqual(d, expected);
}
