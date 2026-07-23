import { signSession } from "./authJwt";

export interface Session {
  accessToken: string;
  user: { id: string; email?: string | null; channel?: string | null };
}

/** 为指定用户签发会话（自建鉴权统一出口）。 */
export function issueSession(
  userId: string,
  user?: Partial<Session["user"]>,
): Session {
  return {
    accessToken: signSession(userId),
    user: { id: userId, ...user },
  };
}
