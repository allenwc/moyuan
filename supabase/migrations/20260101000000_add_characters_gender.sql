-- 为人物（characters）表增加 gender 字段，用于区分男/女；为空表示中性（未选择）。
-- 在 Supabase SQL Editor 或迁移工具中执行。

alter table public.characters
  add column if not exists gender text;
