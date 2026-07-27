const { getSession } = require("./lib/session");
const { ENV_ID } = require("./lib/config");
const { loadBrandFonts } = require("./lib/fonts");

App({
  onLaunch() {
    // 独立 CloudBase：走 HTTP 网关，不再 wx.cloud.init（避免 INVALID_ENV）
    this.globalData = {
      envId: ENV_ID,
      session: getSession(),
    };
    loadBrandFonts();
  },
  globalData: {
    envId: "",
    session: null,
  },
});
