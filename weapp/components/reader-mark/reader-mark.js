const {
  readerSealChar,
  readerShortLabel,
} = require("../../lib/readerIdentity");

Component({
  properties: {
    user: { type: Object, value: null },
    compact: { type: Boolean, value: false },
  },
  data: {
    sealChar: "藏",
    label: "",
  },
  observers: {
    user(user) {
      this.setData({
        sealChar: readerSealChar(user || {}),
        label: readerShortLabel(user || {}),
      });
    },
  },
  methods: {
    onOpen() {
      this.triggerEvent("open");
    },
  },
});
