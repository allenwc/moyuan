import type { Gender } from "@/types";

export type GenderShapeKind = "square" | "circle" | "diamond";

/** 性别 → 形状：男=方形，女=圆形，未选择=菱形（家谱图惯例，最直观） */
export function getGenderShape(gender?: Gender): GenderShapeKind {
  if (gender === "male") return "square";
  if (gender === "female") return "circle";
  return "diamond";
}

interface GenderShapeProps {
  shape: GenderShapeKind;
  r: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 以性别形状绘制节点主体。方形/菱形均按外接圆半径为 r 计算，
 * 保证三种形状在画布上视觉大小一致，且与按身份缩放的半径对齐。
 */
export function GenderShape({
  shape,
  r,
  fill,
  stroke,
  strokeWidth,
  className,
  style,
}: GenderShapeProps) {
  if (shape === "circle") {
    return (
      <circle
        r={r}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        className={className}
        style={style}
      />
    );
  }
  if (shape === "square") {
    const s = r * 2;
    return (
      <rect
        x={-r}
        y={-r}
        width={s}
        height={s}
        rx={r * 0.2}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        className={className}
        style={style}
      />
    );
  }
  // diamond：旋转 45° 的方，外接圆半径 = r
  const s = r * 1.4142;
  return (
    <rect
      x={-s / 2}
      y={-s / 2}
      width={s}
      height={s}
      rx={s * 0.12}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      transform="rotate(45)"
      className={className}
      style={style}
    />
  );
}
