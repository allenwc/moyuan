import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { setNavigator } from "@/lib/nav";
import { useAuthStore } from "@/store/useAuthStore";
import LoginPage from "@/pages/login/index";
import LibraryPage from "@/pages/library/index";
import EditorPage from "@/pages/editor/index";
import "./index.css";
import "./app.scss";

function NavigatorBridge({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  useEffect(() => {
    setNavigator(navigate);
  }, [navigate]);
  return <>{children}</>;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const ready = useAuthStore((s) => s.ready);
  const user = useAuthStore((s) => s.user);
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper text-ink-mute text-sm">
        加载中…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <NavigatorBridge>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <AuthGate>
                <LibraryPage />
              </AuthGate>
            }
          />
          <Route
            path="/editor"
            element={
              <AuthGate>
                <EditorPage />
              </AuthGate>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </NavigatorBridge>
    </BrowserRouter>
  );
}
