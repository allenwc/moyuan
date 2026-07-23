/// <reference types="@tarojs/taro" />

declare module "*.png";
declare module "*.gif";
declare module "*.jpg";
declare module "*.jpeg";
declare module "*.svg";
declare module "*.css";
declare module "*.scss";
declare module "*.sass";
declare module "*.less";

declare namespace NodeJS {
  interface ProcessEnv {
    TARO_ENV:
      | "weapp"
      | "swan"
      | "alipay"
      | "h5"
      | "rn"
      | "tt"
      | "quickapp"
      | "qq"
      | "jd";
    TARO_APP_API_BASE?: string;
    TARO_APP_DEV_BYPASS?: string;
    TARO_APP_CLOUDBASE_ENV_ID?: string;
  }
}
