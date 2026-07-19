// 领域类型现由 @moyuan/core 提供，这里转发以保持 `@/types` 引用兼容，
// 并保留仅前端使用的 UI 类型。
export type {
  ThemeColor,
  RelationType,
  Direction,
  Novel,
  Character,
  Relation,
  NovelInput,
  CharacterInput,
  RelationInput,
} from "@moyuan/core";

export interface ExportOptions {
  format: "png" | "jpg" | "svg";
  scale: 1 | 2 | 3;
  background: "transparent" | "paper" | "ink" | string;
  includeLabels: boolean;
  includeTitle: boolean;
}

export interface Viewport {
  scale: number;
  x: number;
  y: number;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: "png",
  scale: 2,
  background: "paper",
  includeLabels: true,
  includeTitle: true,
};
