export { getGenderShape, type GenderShapeKind, type GenderShapeProps } from "./genderShapeShared";
import type { GenderShapeProps } from "./genderShapeShared";

/** H5：SVG 图形节点（需置于 <svg> 内） */
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

/** 面板/表单用：自带 viewBox 的独立图标 */
export function GenderShapeIcon({
  r,
  className,
  style,
  ...rest
}: GenderShapeProps) {
  const pad = Math.max(r * 0.25, 1);
  const size = (r + pad) * 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-r - pad} ${-r - pad} ${size} ${size}`}
      className={className}
      style={style}
      aria-hidden
    >
      <GenderShape r={r} {...rest} />
    </svg>
  );
}
