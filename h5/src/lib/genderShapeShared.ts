import type { Gender } from "@/types";

export type GenderShapeKind = "square" | "circle" | "diamond";

/** 性别 → 形状：男=方形，女=圆形，未选择=菱形 */
export function getGenderShape(gender?: Gender): GenderShapeKind {
  if (gender === "male") return "square";
  if (gender === "female") return "circle";
  return "diamond";
}

export interface GenderShapeProps {
  shape: GenderShapeKind;
  r: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  className?: string;
  style?: React.CSSProperties;
}
