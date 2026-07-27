/** 自定义导航栏尺寸（避开状态栏与胶囊） */
function getNavMetrics() {
  try {
    const sys = wx.getSystemInfoSync();
    const statusBarHeight = sys.statusBarHeight || 20;
    const menu = wx.getMenuButtonBoundingClientRect
      ? wx.getMenuButtonBoundingClientRect()
      : null;
    if (menu && menu.height) {
      const gap = menu.top - statusBarHeight;
      const navBarHeight = menu.height + gap * 2;
      return {
        statusBarHeight,
        navBarHeight,
        menuRight: sys.windowWidth - menu.left,
        menuBottom: menu.bottom,
        totalTop: statusBarHeight + navBarHeight,
      };
    }
    return {
      statusBarHeight,
      navBarHeight: 44,
      menuRight: 96,
      menuBottom: statusBarHeight + 44,
      totalTop: statusBarHeight + 44,
    };
  } catch {
    return {
      statusBarHeight: 20,
      navBarHeight: 44,
      menuRight: 96,
      menuBottom: 64,
      totalTop: 64,
    };
  }
}

module.exports = { getNavMetrics };
