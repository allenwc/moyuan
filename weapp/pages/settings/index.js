const { currentUser, signOut, bindWeChat } = require("../../lib/auth");
const { readerFullLabel, readerChannelLabel } = require("../../lib/readerIdentity");
const { getNavMetrics } = require("../../lib/navBar");

Page({
  data: {
    statusBarHeight: 20,
    user: null,
    accountName: "",
    channelLabel: "",
    isEmail: false,
    wechatBound: false,
    binding: false,
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
