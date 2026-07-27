import cloudbase from "@cloudbase/js-sdk/app";
import { registerAuth } from "@cloudbase/js-sdk/auth";
import { registerFunctions } from "@cloudbase/js-sdk/functions";

export type CloudbaseApp = cloudbase.app.App;

export interface CreateAppOptions {
  envId: string;
}

const apps = new Map<string, CloudbaseApp>();

/** 按 envId 获取（或创建）CloudBase App 单例 */
export function createApp(options: CreateAppOptions): CloudbaseApp {
  const envId = (options.envId || "").trim();
  if (!envId) {
    throw new Error("未配置 CloudBase envId，无法初始化 SDK");
  }
  const cached = apps.get(envId);
  if (cached) return cached;

  const app = cloudbase.init({ env: envId });
  registerAuth(app);
  registerFunctions(app);
  apps.set(envId, app);
  return app;
}

export function getAuth(app: CloudbaseApp) {
  return app.auth();
}
