/** 浏览器可视区域尺寸 */
export function getScreenSize(): { width: number; height: number } {
  if (typeof window !== "undefined") {
    return { width: window.innerWidth, height: window.innerHeight };
  }
  return { width: 375, height: 667 };
}
