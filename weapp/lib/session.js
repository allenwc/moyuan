const KEY = "moyuan_auth";

function getSession() {
  try {
    return wx.getStorageSync(KEY) || null;
  } catch {
    return null;
  }
}

function saveSession(session) {
  try {
    wx.setStorageSync(KEY, session);
    const app = getApp();
    if (app) app.globalData.session = session;
  } catch {
    /* ignore */
  }
}

function clearSession() {
  try {
    wx.removeStorageSync(KEY);
    const app = getApp();
    if (app) app.globalData.session = null;
  } catch {
    /* ignore */
  }
}

module.exports = { getSession, saveSession, clearSession };
