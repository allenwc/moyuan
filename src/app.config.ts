export default defineAppConfig({
  pages: [
    "pages/library/index",
    "pages/editor/index",
    "pages/login/index",
  ],
  lazyCodeLoading: "requiredComponents",
  window: {
    backgroundTextStyle: "light",
    navigationBarBackgroundColor: "#f5efe2",
    navigationBarTitleText: "墨缘",
    navigationBarTextStyle: "black",
    backgroundColor: "#f5efe2",
  },
});
