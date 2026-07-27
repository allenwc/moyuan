/** 全局类型补充（非 Taro） */
declare namespace NodeJS {
  interface ProcessEnv {
    CLOUDBASE_ENV_ID?: string;
    MOYUAN_JWT_SECRET?: string;
    MOYUAN_API_KEY?: string;
    MOYUAN_ALLOW_DEV_LOGIN?: string;
    WECHAT_APPID?: string;
    WECHAT_SECRET?: string;
  }
}

export {};
