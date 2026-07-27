Component({
  properties: {
    open: { type: Boolean, value: false },
    title: { type: String, value: "" },
    description: { type: String, value: "" },
    confirmText: { type: String, value: "确定" },
    cancelText: { type: String, value: "取消" },
    tone: { type: String, value: "default" },
  },
  methods: {
    onConfirm() {
      this.triggerEvent("confirm");
    },
    onCancel() {
      this.triggerEvent("cancel");
    },
    noop() {},
  },
});
