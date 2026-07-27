const THEME_PALETTES = [
  { key: "ink", label: "松烟墨", primary: "#1f1b16", soft: "#5a5048", deep: "#0f0c08", text: "#f5efe2" },
  { key: "vermillion", label: "朱砂印", primary: "#a8322d", soft: "#c4514a", deep: "#7a2420", text: "#faf6ec" },
  { key: "gold", label: "陈年老", primary: "#a3824a", soft: "#c2a26b", deep: "#6f5430", text: "#1f1b16" },
  { key: "moss", label: "苔间绿", primary: "#5b6b4a", soft: "#83956e", deep: "#3d4830", text: "#faf6ec" },
  { key: "indigo", label: "青墨蓝", primary: "#3a4a5a", soft: "#62748a", deep: "#26323e", text: "#faf6ec" },
  { key: "plum", label: "绛紫", primary: "#5d3a4a", soft: "#8a5e6f", deep: "#3f2632", text: "#faf6ec" },
];

function getThemePalette(key) {
  return THEME_PALETTES.find((p) => p.key === key) || THEME_PALETTES[1];
}

const RELATION_TYPES = [
  { key: "kin", label: "亲属", color: "#a8322d", glyph: "亲" },
  { key: "friend", label: "挚友", color: "#5b6b4a", glyph: "友" },
  { key: "enemy", label: "敌对", color: "#1f1b16", glyph: "敌" },
  { key: "master", label: "师徒", color: "#a3824a", glyph: "师" },
  { key: "lover", label: "恋人", color: "#5d3a4a", glyph: "情" },
  { key: "master-servant", label: "主从", color: "#3a4a5a", glyph: "从" },
  { key: "sect", label: "同门", color: "#7a6235", glyph: "门" },
  { key: "other", label: "其他", color: "#6b6359", glyph: "他" },
];

function getRelationMeta(type) {
  return RELATION_TYPES.find((r) => r.key === type) || RELATION_TYPES[7];
}

const CHARACTER_ROLES = [
  "主角",
  "重要配角",
  "配角",
  "反派",
  "神秘人物",
  "历史人物",
  "叙述者",
  "其他",
];

const CHARACTER_GENDERS = [
  { key: "male", label: "男", color: "#2f4858" },
  { key: "female", label: "女", color: "#7a3b52" },
  { key: "unknown", label: "未知", color: "#6b6359" },
];

const CHARACTER_COLOR_PRESETS = [
  "#a8322d",
  "#a3824a",
  "#5b6b4a",
  "#3a4a5a",
  "#5d3a4a",
  "#1f1b16",
  "#7a6235",
  "#6b6359",
];

function formatTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `今日 ${hh}:${mm}`;
  }
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (days < 7) return `${days} 日前`;
  if (days < 30) return `${Math.floor(days / 7)} 周前`;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y === now.getFullYear() ? `${m}.${day}` : `${y}.${m}.${day}`;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

module.exports = {
  THEME_PALETTES,
  getThemePalette,
  RELATION_TYPES,
  getRelationMeta,
  CHARACTER_ROLES,
  CHARACTER_GENDERS,
  CHARACTER_COLOR_PRESETS,
  formatTime,
  clamp,
};
