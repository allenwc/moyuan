let counter = 0;

/** 生成进程内唯一的 id（带前缀，便于区分实体类型） */
export function uid(prefix = "id"): string {
  counter += 1;
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${t}_${r}_${counter.toString(36)}`;
}
