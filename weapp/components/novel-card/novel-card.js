const { getThemePalette, formatTime } = require("../../lib/theme");

Component({
  properties: {
    novel: { type: Object, value: {} },
    index: { type: Number, value: 0 },
    charCount: { type: Number, value: 0 },
    relCount: { type: Number, value: 0 },
  },
  data: {
    palette: getThemePalette("vermillion"),
    vol: "01",
    shortTitle: "",
    timeLabel: "",
  },
  observers: {
    "novel, index": function (novel, index) {
      const n = novel || {};
      const palette = getThemePalette(n.themeColor || "vermillion");
      this.setData({
        palette,
        vol: String((index || 0) + 1).padStart(2, "0"),
        shortTitle: String(n.title || "").slice(0, 8),
        timeLabel: formatTime(n.updatedAt || 0),
      });
    },
  },
  methods: {
    onOpen() {
      this.triggerEvent("open", { id: this.data.novel.id });
    },
    onMore() {
      this.triggerEvent("more", { novel: this.data.novel });
    },
  },
});
