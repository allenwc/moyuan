import type { NavigateFunction } from "react-router-dom";

let navigate: NavigateFunction | null = null;

/** 在 App 根组件挂载时注入，供非组件模块跳转 */
export function setNavigator(fn: NavigateFunction) {
  navigate = fn;
}

export function goLibrary() {
  navigate?.("/", { replace: true });
}

export function goLogin() {
  navigate?.("/login");
}

export function goEditor(novelId: string, query?: Record<string, string>) {
  const params = new URLSearchParams({ novelId });
  if (query) {
    for (const [k, v] of Object.entries(query)) params.set(k, v);
  }
  navigate?.(`/editor?${params.toString()}`);
}
