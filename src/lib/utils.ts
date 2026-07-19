import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { RelationType, ThemeColor } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

let counter = 0;
export function uid(prefix = "id"): string {
  counter += 1;
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${t}_${r}_${counter.toString(36)}`;
}

export function formatTime(ts: number): string {
  if (!ts) return "—";
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    return `今日 ${hh}:${mm}`;
  }
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 7) return `${days} 日前`;
  if (days < 30) return `${Math.floor(days / 7)} 周前`;
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return y === now.getFullYear() ? `${m}.${day}` : `${y}.${m}.${day}`;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export interface ThemePalette {
  key: ThemeColor;
  label: string;
  primary: string;
  soft: string;
  deep: string;
  text: string;
}

export const THEME_PALETTES: ThemePalette[] = [
  {
    key: "ink",
    label: "松烟墨",
    primary: "#1f1b16",
    soft: "#5a5048",
    deep: "#0f0c08",
    text: "#f5efe2",
  },
  {
    key: "vermillion",
    label: "朱砂印",
    primary: "#a8322d",
    soft: "#c4514a",
    deep: "#7a2420",
    text: "#faf6ec",
  },
  {
    key: "gold",
    label: "陈年老",
    primary: "#a3824a",
    soft: "#c2a26b",
    deep: "#6f5430",
    text: "#1f1b16",
  },
  {
    key: "moss",
    label: "苔间绿",
    primary: "#5b6b4a",
    soft: "#83956e",
    deep: "#3d4830",
    text: "#faf6ec",
  },
  {
    key: "indigo",
    label: "青墨蓝",
    primary: "#3a4a5a",
    soft: "#62748a",
    deep: "#26323e",
    text: "#faf6ec",
  },
  {
    key: "plum",
    label: "绛紫",
    primary: "#5d3a4a",
    soft: "#8a5e6f",
    deep: "#3f2632",
    text: "#faf6ec",
  },
];

export function getThemePalette(key: ThemeColor): ThemePalette {
  return THEME_PALETTES.find((p) => p.key === key) ?? THEME_PALETTES[0];
}

export interface RelationTypeMeta {
  key: RelationType;
  label: string;
  color: string;
  stroke: string;
  glyph: string;
}

export const RELATION_TYPES: RelationTypeMeta[] = [
  { key: "kin", label: "亲属", color: "#a8322d", stroke: "#a8322d", glyph: "亲" },
  { key: "friend", label: "挚友", color: "#5b6b4a", stroke: "#5b6b4a", glyph: "友" },
  { key: "enemy", label: "敌对", color: "#1f1b16", stroke: "#1f1b16", glyph: "敌" },
  { key: "master", label: "师徒", color: "#a3824a", stroke: "#a3824a", glyph: "师" },
  { key: "lover", label: "恋人", color: "#5d3a4a", stroke: "#5d3a4a", glyph: "情" },
  {
    key: "master-servant",
    label: "主从",
    color: "#3a4a5a",
    stroke: "#3a4a5a",
    glyph: "从",
  },
  { key: "sect", label: "同门", color: "#7a6235", stroke: "#7a6235", glyph: "门" },
  { key: "other", label: "其他", color: "#6b6359", stroke: "#6b6359", glyph: "他" },
];

export function getRelationMeta(type: RelationType): RelationTypeMeta {
  return RELATION_TYPES.find((r) => r.key === type) ?? RELATION_TYPES[7];
}

export const CHARACTER_ROLES = [
  "主角",
  "重要配角",
  "配角",
  "反派",
  "神秘人物",
  "历史人物",
  "叙述者",
  "其他",
];

export const CHARACTER_COLOR_PRESETS = [
  "#a8322d",
  "#a3824a",
  "#5b6b4a",
  "#3a4a5a",
  "#5d3a4a",
  "#1f1b16",
  "#7a6235",
  "#6b6359",
];

export const DEFAULT_VIEWPORT = { scale: 1, x: 0, y: 0 };
