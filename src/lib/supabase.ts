import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

/** 是否已正确配置 Supabase 连接（缺少环境变量时应用仍可本地运行） */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    "[supabase] 缺少 VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY，数据将不会同步到云端。请检查 .env.local。",
  );
}

// 即使缺少配置也创建实例，避免解构报错；未配置时相关操作会被 repo 层跳过。
export const supabase = createClient(
  supabaseUrl ?? "http://localhost",
  supabaseAnonKey ?? "public-anon-key",
);
