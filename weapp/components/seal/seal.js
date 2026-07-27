const TONES = {
  vermillion: { bg: "#a8322d", fg: "#faf6ec" },
  gold: { bg: "#a3824a", fg: "#faf6ec" },
  ink: { bg: "#1f1b16", fg: "#faf6ec" },
};

Component({
  properties: {
    text: { type: String, value: "墨缘" },
    size: { type: Number, value: 56 },
    rotate: { type: Number, value: -3 },
    tone: { type: String, value: "vermillion" },
    square: { type: Boolean, value: true },
  },
  data: {
    chars: ["墨", "缘"],
    fontSize: 19,
    bg: "#a8322d",
    fg: "#faf6ec",
  },
  observers: {
    "text, size, tone": function (text, size, tone) {
      const t = String(text || "墨缘");
      const toneKey = TONES[tone] || TONES.vermillion;
      this.setData({
        chars: t.split(""),
        fontSize: size * (t.length > 2 ? 0.26 : 0.34),
        bg: toneKey.bg,
        fg: toneKey.fg,
      });
    },
  },
});
