/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLOUDBASE_ENV_ID: string;
  readonly TARO_APP_CLOUDBASE_ENV_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
