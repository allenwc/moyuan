export type ThemeColor =
  | "ink"
  | "vermillion"
  | "gold"
  | "moss"
  | "indigo"
  | "plum";

export type RelationType =
  | "kin"
  | "friend"
  | "enemy"
  | "master"
  | "lover"
  | "master-servant"
  | "sect"
  | "other";

export type Direction = "one-way" | "mutual";

export interface Novel {
  id: string;
  title: string;
  author: string;
  synopsis: string;
  themeColor: ThemeColor;
  createdAt: number;
  updatedAt: number;
}

export interface Character {
  id: string;
  novelId: string;
  name: string;
  alias?: string;
  role: string;
  faction: string;
  color: string;
  note: string;
  x: number;
  y: number;
  createdAt: number;
}

export interface Relation {
  id: string;
  novelId: string;
  sourceId: string;
  targetId: string;
  type: RelationType;
  direction: Direction;
  note: string;
  createdAt: number;
}

export interface NovelInput {
  title: string;
  author: string;
  synopsis: string;
  themeColor: ThemeColor;
}

export interface CharacterInput {
  name: string;
  alias?: string;
  role: string;
  faction: string;
  color: string;
  note: string;
  x: number;
  y: number;
}

export interface RelationInput {
  sourceId: string;
  targetId: string;
  type: RelationType;
  direction: Direction;
  note: string;
}

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
