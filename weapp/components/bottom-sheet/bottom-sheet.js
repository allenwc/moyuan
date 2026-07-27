Component({
  options: {
    multipleSlots: true,
  },
  properties: {
    open: { type: Boolean, value: false },
    title: { type: String, value: "" },
    subtitle: { type: String, value: "" },
    customTitle: { type: Boolean, value: false },
    /** auto | tall | full */
    size: { type: String, value: "auto" },
    showFooter: { type: Boolean, value: false },
    bodyMax: { type: String, value: "60vh" },
  },
  data: {
    scrollTop: 0,
  },
  observers: {
    open(v) {
      if (v) {
        // 打开时重置滚动，并强制刷新 scroll-top
        this.setData({ scrollTop: 0 });
        setTimeout(() => {
          this.setData({ scrollTop: 0.01 });
          this.setData({ scrollTop: 0 });
        }, 16);
      }
    },
  },
  methods: {
    onClose() {
      this.triggerEvent("close");
    },
    noop() {},
  },
});
