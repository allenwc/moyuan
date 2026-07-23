import Taro from "@tarojs/taro";

/** 跨端获取可视区域尺寸（避免直接依赖 window） */
export function getScreenSize(): { width: number; height: number } {
  try {
    const info = Taro.getSystemInfoSync();
    return {
      width: info.windowWidth || info.screenWidth || 375,
      height: info.windowHeight || info.screenHeight || 667,
    };
  } catch {
    if (typeof window !== "undefined") {
      return { width: window.innerWidth, height: window.innerHeight };
    }
    return { width: 375, height: 667 };
  }
}
