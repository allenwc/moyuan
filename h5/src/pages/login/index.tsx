import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import "./index.scss";

/** 邮箱密码登录 */
export default function LoginPage() {
  const ready = useAuthStore((s) => s.ready);
  const user = useAuthStore((s) => s.user);
  const error = useAuthStore((s) => s.error);
  const init = useAuthStore((s) => s.init);
  const loginWithEmailPassword = useAuthStore((s) => s.loginWithEmailPassword);
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<{
    username?: string;
    password?: string;
  }>({});

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const validate = useCallback((): boolean => {
    const errs: { username?: string; password?: string } = {};
    if (!username.trim()) errs.username = "请输入用户名";
    if (!password) errs.password = "请输入密码";
    setFieldError(errs);
    return Object.keys(errs).length === 0;
  }, [username, password]);

  const onLogin = useCallback(async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      await loginWithEmailPassword(username.trim(), password);
    } catch (err) {
      setFieldError({
        username:
          err instanceof Error
            ? err.message
            : "登录失败，请检查用户名和密码后重试",
      });
    } finally {
      setBusy(false);
    }
  }, [username, password, loginWithEmailPassword, validate]);

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <span className="login-brand">墨缘</span>
          <span className="login-subtitle">小说人物关系图谱</span>
        </div>

        <div className="login-field">
          <span className="login-label">用户名</span>
          <input
            className={`login-input${fieldError.username ? " login-input--error" : ""}`}
            type="text"
            name="username"
            value={username}
            maxLength={64}
            placeholder="输入用户名…"
            aria-label="用户名"
            onChange={(e) => {
              setUsername(e.target.value);
              if (fieldError.username)
                setFieldError((p) => ({ ...p, username: undefined }));
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void onLogin();
            }}
          />
          {fieldError.username && (
            <span className="login-field-error">{fieldError.username}</span>
          )}
        </div>

        <div className="login-field">
          <span className="login-label">密码</span>
          <div className="login-input-wrap">
            <input
              className={`login-input login-input--password${
                fieldError.password ? " login-input--error" : ""
              }`}
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              maxLength={64}
              placeholder="输入登录密码…"
              aria-label="登录密码"
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldError.password)
                  setFieldError((p) => ({ ...p, password: undefined }));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void onLogin();
              }}
            />
            <button
              type="button"
              className="login-pwd-toggle"
              aria-label={showPassword ? "隐藏密码" : "显示密码"}
              onClick={() => setShowPassword((v) => !v)}
            >
              <span className="login-pwd-toggle-icon">
                {showPassword ? "隐藏" : "显示"}
              </span>
            </button>
          </div>
          {fieldError.password && (
            <span className="login-field-error">{fieldError.password}</span>
          )}
        </div>

        {error && !fieldError.username && !fieldError.password && (
          <div className="login-global-error">{error}</div>
        )}

        <button
          type="button"
          className={`login-btn login-btn--primary${busy ? " login-btn--busy" : ""}`}
          disabled={busy || !ready}
          onClick={() => {
            if (!busy) void onLogin();
          }}
        >
          <span className="login-btn-text">{busy ? "登录中…" : "登录"}</span>
        </button>

        <div className="login-footer">
          <span className="login-footer-text">
            使用 CloudBase 邮箱账号登录，数据隔离存储。
          </span>
        </div>
      </div>
    </div>
  );
}
