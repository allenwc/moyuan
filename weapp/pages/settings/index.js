const { currentUser, signOut, bindWeChat } = require("../../lib/auth");
const { readerFullLabel, readerChannelLabel } = require("../../lib/readerIdentity");
const { getNavMetrics } = require("../../lib/navBar");
const { getApiKey, regenerateApiKey } = require("../../lib/apiKeyRepo");

Page({
  data: {
    statusBarHeight: 20,
    user: null,
    accountName: "",
    channelLabel: "",
    isEmail: false,
    wechatBound: false,
    binding: false,
    apiKey: "",
    apiKeyLoading: false,
    apiKeyBusy: false,
  },

  onLoad() {
    const m = getNavMetrics();
    this.setData({ statusBarHeight: m.statusBarHeight });
  },

  onShow() {
    const user = currentUser();
    if (!user) return;
    this.setData({
      user,
      accountName: readerFullLabel(user),
      channelLabel: readerChannelLabel(user),
      isEmail: user.channel === "email",
    });
    void this.loadApiKey();
  },

  async loadApiKey() {
    this.setData({ apiKeyLoading: true });
    try {
      const apiKey = await getApiKey();
      this.setData({ apiKey });
    } catch (err) {
      wx.showToast({
        title: (err && err.message) || "读取墨印失败",
        icon: "none",
      });
    } finally {
      this.setData({ apiKeyLoading: false });
    }
  },

  onCopyApiKey() {
    if (!this.data.apiKey) {
      wx.showToast({ title: "请先生成墨印", icon: "none" });
      return;
    }
    wx.setClipboardData({
      data: this.data.apiKey,
      success: () => {
        wx.showToast({ title: "已复制墨印", icon: "success" });
      },
    });
  },

  async onRegenerateApiKey() {
    if (this.data.apiKeyBusy) return;
    const hadApiKey = !!this.data.apiKey;
    wx.showModal({
      title: "重铸墨印？",
      content: "重铸后旧墨印将立刻失效。",
      confirmText: "确认重铸墨印",
      cancelText: "取消",
      success: async (r) => {
        if (!r.confirm) return;
        this.setData({ apiKeyBusy: true });
        wx.showLoading({ title: hadApiKey ? "重铸中…" : "生成中…" });
        try {
          const apiKey = await regenerateApiKey();
          wx.hideLoading();
          this.setData({ apiKey });
          wx.showToast({
            title: hadApiKey ? "已重铸墨印" : "已生成墨印",
            icon: "success",
          });
        } catch (err) {
          wx.hideLoading();
          wx.showToast({
            title: (err && err.message) || "生成/重铸墨印失败",
            icon: "none",
          });
        } finally {
          this.setData({ apiKeyBusy: false });
        }
      },
    });
  },

  async onBindWeChat() {
    if (this.data.binding) return;
    this.setData({ binding: true });
    wx.showLoading({ title: "绑定中…" });
    try {
      const { code } = await wx.login();
      const res = await bindWeChat(code);
      wx.hideLoading();
      const ok = !!(res && (res.ok || res.alreadyLinked));
      this.setData({ wechatBound: ok });
      wx.showToast({
        title: res && res.alreadyLinked ? "已绑定" : "绑定成功",
        icon: "success",
      });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({
        title: (err && err.message) || "绑定失败",
        icon: "none",
      });
    } finally {
      this.setData({ binding: false });
    }
  },

  onLogout() {
    wx.showModal({
      title: "退出登录",
      content: "退出后需重新登录才能翻阅藏书，云端卷宗仍会保留。",
      confirmText: "退出",
      cancelText: "留着",
      success: (r) => {
        if (r.confirm) {
          signOut();
          wx.reLaunch({ url: "/pages/login/index" });
        }
      },
    });
  },
});
