import { View } from "@tarojs/components";
export { getGenderShape, type GenderShapeKind, type GenderShapeProps } from "./genderShapeShared";
import type { GenderShapeProps } from "./genderShapeShared";

/** 小程序：用 View 近似性别形状，避免 SVG 模板缺失 */
export function GenderShape({
  shape,
  r,
  fill,
  stroke,
  strokeWidth,
  className,
  style,
}: GenderShapeProps) {
  const size = Math.max(8, r * 2);
  const isTransparent = !fill || fill === "none" || fill === "transparent";
  const base: React.CSSProperties = {
    width: size,
    height: size,
    backgroundColor: isTransparent ? "transparent" : fill,
    borderWidth: strokeWidth,
    borderStyle: "solid",
    borderColor: stroke,
    boxSizing: "border-box",
    ...style,
  };

  if (shape === "circle") {
    return (
      <View
        className={className}
        style={{ ...base, borderRadius: "50%" }}
      />
    );
  }
  if (shape === "square") {
    return (
      <View
        className={className}
        style={{ ...base, borderRadius: Math.max(2, r * 0.2) }}
      />
    );
  }
  return (
    <View
      className={className}
      style={{
        ...base,
        borderRadius: Math.max(2, size * 0.06),
        transform: "rotate(45deg)",
      }}
    />
  );
}

/** 面板/表单用图标（小程序侧与 GenderShape 相同） */
export function GenderShapeIcon(props: GenderShapeProps) {
  return <GenderShape {...props} />;
}
