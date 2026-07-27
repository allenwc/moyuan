const { loginWithEmail, loginWithWeChat, getValidSession } = require("../../lib/auth");

Page({
  data: {
    email: "",
    password: "",
    showPassword: false,
    busy: false,
    wechatBusy: false,
    fieldError: {},
  },

  onShow() {
    // 仅完整会话（token + uid）才跳过登录页，避免残缺缓存把人顶回书库
    if (getValidSession()) {
      wx.reLaunch({ url: "/pages/library/index" });
    }
  },

  onEmail(e) {
    this.setData({
      email: e.detail.value,
      "fieldError.username": "",
    });
  },

  onPassword(e) {
    this.setData({
      password: e.detail.value,
      "fieldError.password": "",
    });
  },

  togglePwd() {
    this.setData({ showPassword: !this.data.showPassword });
  },

  async onLogin() {
    if (this.data.busy) return;
    const email = (this.data.email || "").trim();
    const password = this.data.password || "";
    const fieldError = {};
    if (!email) fieldError.username = "请输入用户名";
    if (!password) fieldError.password = "请输入密码";
    if (Object.keys(fieldError).length) {
      this.setData({ fieldError });
      return;
    }
    this.setData({ busy: true, fieldError: {} });
    try {
      await loginWithEmail(email, password);
      wx.reLaunch({ url: "/pages/library/index" });
    } catch (err) {
      this.setData({
        fieldError: {
          username: (err && err.message) || "登录失败，请检查用户名和密码后重试",
        },
      });
    } finally {
      this.setData({ busy: false });
    }
  },

  /** 微信一键登录 */
  onWechatLogin() {
    if (this.data.wechatBusy) return;
    this.setData({ wechatBusy: true, fieldError: {} });
    wx.login({
      success: async (res) => {
        if (!res.code) {
          this.setData({ wechatBusy: false });
          wx.showToast({ title: "获取微信授权失败", icon: "none" });
          return;
        }
        try {
          await loginWithWeChat(res.code);
          wx.reLaunch({ url: "/pages/library/index" });
        } catch (err) {
          this.setData({ wechatBusy: false });
          wx.showToast({
            title: (err && err.message) || "微信登录失败，请重试",
            icon: "none",
            duration: 2500,
          });
        }
      },
      fail: () => {
        this.setData({ wechatBusy: false });
        wx.showToast({ title: "微信授权失败", icon: "none" });
      },
    });
  },
});
