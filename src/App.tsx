import { useEffect } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Library from "@/pages/Library";
import Editor from "@/pages/Editor";
import { useNovelStore } from "@/store/useNovelStore";

export default function App() {
  const hydrated = useNovelStore((s) => s.hydrated);
  const hydrate = useNovelStore((s) => s.hydrate);
  const loadError = useNovelStore((s) => s.loadError);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper text-ink">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-ink/20 border-t-ink" />
        <p className="text-sm tracking-widest text-ink/60">正在载入卷宗…</p>
      </div>
    );
  }

  return (
    <Router>
      {loadError && (
        <div className="fixed inset-x-0 top-0 z-50 bg-red-700/90 px-4 py-2 text-center text-xs text-white">
          云端数据加载失败：{loadError}（当前为本地会话，改动可能未同步）
        </div>
      )}
      <Routes>
        <Route path="/" element={<Library />} />
        <Route path="/editor/:novelId" element={<Editor />} />
        <Route path="*" element={<Library />} />
      </Routes>
    </Router>
  );
}
