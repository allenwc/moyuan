import Taro from "@tarojs/taro";

/** 打开书库首页 */
export function goLibrary() {
  void Taro.reLaunch({ url: "/pages/library/index" });
}

/** 打开登录页 */
export function goLogin() {
  void Taro.navigateTo({ url: "/pages/login/index" });
}

/** 打开图谱编辑器 */
export function goEditor(novelId: string, query?: Record<string, string>) {
  const params = new URLSearchParams({ novelId });
  if (query) {
    for (const [k, v] of Object.entries(query)) params.set(k, v);
  }
  void Taro.navigateTo({
    url: `/pages/editor/index?${params.toString()}`,
  });
}
