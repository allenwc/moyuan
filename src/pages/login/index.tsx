import { useEffect, useState, useCallback } from "react";
import { View, Text, Input } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useAuthStore } from "@/store/useAuthStore";
import "./index.scss";

/** 邮箱密码登录（主路径）；微信登录仍保留为次要入口 */
export default function LoginPage() {
  const ready = useAuthStore((s) => s.ready);
  const user = useAuthStore((s) => s.user);
  const error = useAuthStore((s) => s.error);
  const init = useAuthStore((s) => s.init);
  const loginWithEmailPassword = useAuthStore((s) => s.loginWithEmailPassword);
  const loginWithWechatMini = useAuthStore((s) => s.loginWithWechatMini);
  const loginWithWechatWebCode = useAuthStore((s) => s.loginWithWechatWebCode);
  const fetchWechatWebAuthorizeUrl = useAuthStore(
    (s) => s.fetchWechatWebAuthorizeUrl,
  );

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<{ username?: string; password?: string }>({});
  const isWeapp = process.env.TARO_ENV === "weapp";

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (user) {
      void Taro.reLaunch({ url: "/pages/library/index" });
    }
  }, [user]);

  // H5：微信 OAuth 回调 ?code=
  useEffect(() => {
    if (isWeapp || !ready) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(
      window.location.hash.replace(/^#\/?/, "").split("?")[1] ?? "",
    );
    const code = params.get("code") || hashParams.get("code");
    if (!code) return;
    setBusy(true);
    void loginWithWechatWebCode(code)
      .catch((err) =>
        setFieldError({
          username: err instanceof Error ? err.message : "扫码登录失败，请重试",
        }),
      )
      .finally(() => setBusy(false));
  }, [isWeapp, ready, loginWithWechatWebCode]);

  const validate = useCallback((): boolean => {
    const errs: { username?: string; password?: string } = {};
    if (!username.trim()) {
      errs.username = "请输入用户名";
    }
    if (!password) {
      errs.password = "请输入密码";
    }
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
          err instanceof Error ? err.message : "登录失败，请检查用户名和密码后重试",
      });
    } finally {
      setBusy(false);
    }
  }, [username, password, loginWithEmailPassword, validate]);

  const onWechatLogin = useCallback(async () => {
    setBusy(true);
    setFieldError({});
    try {
      if (isWeapp) {
        await loginWithWechatMini();
        return;
      }
      const redirectUri = window.location.origin + window.location.pathname;
      const url = await fetchWechatWebAuthorizeUrl(redirectUri);
      window.location.href = url;
    } catch (err) {
      setFieldError({
        username: err instanceof Error ? err.message : "微信登录失败，请稍后重试",
      });
    } finally {
      // H5 跳转授权页前也会走到这里；失败时必须清 busy，否则主按钮一直 disabled
      setBusy(false);
    }
  }, [isWeapp, loginWithWechatMini, fetchWechatWebAuthorizeUrl]);

  return (
    <View className="login-page">
      <View className="login-card">
        {/* 头部 */}
        <View className="login-header">
          <Text className="login-brand">墨缘</Text>
          <Text className="login-subtitle">小说人物关系图谱</Text>
        </View>

        {/* 用户名字段 */}
        <View className="login-field">
          <Text className="login-label">用户名</Text>
          <Input
            className={`login-input${fieldError.username ? " login-input--error" : ""}`}
            type="text"
            name="username"
            value={username}
            maxlength={64}
            confirmType="done"
            placeholder="输入用户名…"
            placeholderClass="login-input-placeholder"
            placeholderStyle="color:#b8afa5;font-size:15px;"
            aria-label="用户名"
            onInput={(e) => {
              setUsername(e.detail.value);
              if (fieldError.username)
                setFieldError((p) => ({ ...p, username: undefined }));
            }}
            onConfirm={() => void onLogin()}
          />
          {fieldError.username && (
            <Text className="login-field-error">{fieldError.username}</Text>
          )}
        </View>

        {/* 密码字段 */}
        <View className="login-field">
          <Text className="login-label">密码</Text>
          <View className="login-input-wrap">
            <Input
              className={`login-input login-input--password${fieldError.password ? " login-input--error" : ""}`}
              name="password"
              password={!showPassword}
              value={password}
              maxlength={64}
              confirmType="done"
              placeholder="输入登录密码…"
              placeholderClass="login-input-placeholder"
              placeholderStyle="color:#b8afa5;font-size:15px;"
              aria-label="登录密码"
              onInput={(e) => {
                setPassword(e.detail.value);
                if (fieldError.password)
                  setFieldError((p) => ({ ...p, password: undefined }));
              }}
              onConfirm={() => void onLogin()}
            />
            <View
              className="login-pwd-toggle"
              aria-label={showPassword ? "隐藏密码" : "显示密码"}
              aria-role="button"
              onClick={() => setShowPassword((v) => !v)}
            >
              <Text className="login-pwd-toggle-icon">
                {showPassword ? "🙈" : "👁"}
              </Text>
            </View>
          </View>
          {fieldError.password && (
            <Text className="login-field-error">{fieldError.password}</Text>
          )}
        </View>

        {/* 全局错误 */}
        {error && !fieldError.username && !fieldError.password && (
          <View className="login-global-error">{error}</View>
        )}

        {/*
          用 View 模拟按钮：避开 Taro/微信 Button 的 disabled、loading 坑
         （disabled={false} 常被写成属性导致发粉且不可点；Enter 仍走 Input.onConfirm）。
        */}
        <View
          className={`login-btn login-btn--primary${busy ? " login-btn--busy" : ""}`}
          role="button"
          aria-disabled={busy}
          onClick={() => {
            if (!busy) void onLogin();
          }}
        >
          <Text className="login-btn-text">{busy ? "登录中…" : "登录"}</Text>
        </View>

        <View
          className={`login-btn login-btn--ghost${
            !ready || busy ? " login-btn--busy" : ""
          }`}
          role="button"
          aria-disabled={!ready || busy}
          onClick={() => {
            if (ready && !busy) void onWechatLogin();
          }}
        >
          <Text className="login-btn-text">
            {isWeapp ? "微信一键登录" : "微信扫码登录"}
          </Text>
        </View>

        {/* 底部提示 */}
        <View className="login-footer">
          <Text className="login-footer-text">
            首次登录将自动创建账号，数据隔离存储。
          </Text>
        </View>
      </View>
    </View>
  );
}
