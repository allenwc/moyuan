import Taro from "@tarojs/taro";
import { loadSession } from "./authStorage";

const API_BASE = (process.env.TARO_APP_API_BASE || "").trim() || "/api";

type Method = "GET" | "POST" | "PUT" | "DELETE";

async function request<T = any>(method: Method, path: string, body?: unknown): Promise<T> {
  const session = loadSession();
  const header: Record<string, string> = { "Content-Type": "application/json" };
  if (session?.accessToken) {
    header["Authorization"] = `Bearer ${session.accessToken}`;
  }
  const res = await Taro.request({
    url: API_BASE + path,
    method,
    header,
    data: body as any,
  });
  if (res.statusCode < 200 || res.statusCode >= 300) {
    const msg =
      res.data && typeof res.data === "object" && (res.data as any).error
        ? (res.data as any).error
        : `请求失败 (${res.statusCode})`;
    throw new Error(msg);
  }
  return res.data as T;
}

export const api = {
  get: <T = any>(path: string) => request<T>("GET", path),
  post: <T = any>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T = any>(path: string, body?: unknown) => request<T>("PUT", path, body),
  del: <T = any>(path: string) => request<T>("DELETE", path),
};
