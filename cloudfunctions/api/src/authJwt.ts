import jwt from "jsonwebtoken";

const SECRET = process.env.MOYUAN_JWT_SECRET || "dev-insecure-secret-change-me";

/** 为指定用户签发会话令牌（自建微信登录 / 邮箱登录 / 开发旁路均走这里）。 */
export function signSession(userId: string): string {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: "365d" });
}

/** 校验会话令牌；无效或过期返回 null。 */
export function verifyJwt(token: string): { sub: string } | null {
  try {
    const payload = jwt.verify(token, SECRET) as { sub?: string };
    return payload.sub ? { sub: payload.sub } : null;
  } catch {
    return null;
  }
}
