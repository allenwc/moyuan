import { PropsWithChildren, useEffect } from "react";
import { useLaunch } from "@tarojs/taro";
import "./index.css";
import "./app.scss";

/** H5：锁死根字号 16px，压过 Taro 750 设计稿自适应脚本（否则整页缩到 ~40%） */
function lockH5RootFontSize() {
  if (process.env.TARO_ENV !== "h5") return;
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("font-size", "16px", "important");
}

function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    lockH5RootFontSize();
  });

  useEffect(() => {
    lockH5RootFontSize();
    if (process.env.TARO_ENV !== "h5" || typeof window === "undefined") {
      return;
    }
    const onResize = () => lockH5RootFontSize();
    window.addEventListener("resize", onResize);
    // 自适应脚本可能在首帧之后才写 inline style
    const t1 = window.setTimeout(lockH5RootFontSize, 0);
    const t2 = window.setTimeout(lockH5RootFontSize, 50);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return children;
}

export default App;
