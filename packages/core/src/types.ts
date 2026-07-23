// 领域类型：前端、API、CLI 共享，不依赖任何运行环境（无 import.meta.env）。

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

export type Gender = "male" | "female";

export interface Novel {
  id: string;
  /** 所属用户（CloudBase users 表 id） */
  userId: string;
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
  gender?: Gender;
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

/** 创建小说时由调用方提供的字段 */
export interface NovelInput {
  title: string;
  author?: string;
  synopsis?: string;
  themeColor?: ThemeColor;
}

/** 创建角色时由调用方提供的字段 */
export interface CharacterInput {
  name: string;
  alias?: string;
  role: string;
  faction: string;
  gender?: Gender;
  color: string;
  note: string;
  x: number;
  y: number;
}

/** 创建关系时由调用方提供的字段 */
export interface RelationInput {
  sourceId: string;
  targetId: string;
  type: RelationType;
  direction: Direction;
  note: string;
}

/** 全量快照：小说 + 角色 + 关系 */
export interface RemoteSnapshot {
  novels: Novel[];
  characters: Character[];
  relations: Relation[];
}

/** 单本小说完整图谱 */
export interface NovelGraph {
  novel: Novel;
  characters: Character[];
  relations: Relation[];
}
