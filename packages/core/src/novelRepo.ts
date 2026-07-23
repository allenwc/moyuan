import type {
  Character,
  CharacterInput,
  Direction,
  Gender,
  Novel,
  NovelGraph,
  NovelInput,
  Relation,
  RelationInput,
  RelationType,
  RemoteSnapshot,
  ThemeColor,
} from "./types";
import { uid } from "./uid";
import { ident, lit, inList, type PgDb, type Row } from "./sql";

export type { RemoteSnapshot, NovelGraph } from "./types";

// ---------- 行映射（CloudBase PG 返回数值为字符串，需 Number 转换）----------

function rowToNovel(r: Row): Novel {
  return {
    id: String(r.id),
    userId: r.user_id == null ? "" : String(r.user_id),
    title: String(r.title ?? ""),
    author: String(r.author ?? ""),
    synopsis: String(r.synopsis ?? ""),
    themeColor: (r.theme_color as ThemeColor) ?? "vermillion",
    createdAt: Number(r.created_at) || 0,
    updatedAt: Number(r.updated_at) || 0,
  };
}

function rowToCharacter(r: Row): Character {
  return {
    id: String(r.id),
    novelId: String(r.novel_id),
    name: String(r.name ?? "无名氏"),
    alias: r.alias == null ? undefined : String(r.alias),
    role: String(r.role ?? ""),
    faction: String(r.faction ?? ""),
    gender: (r.gender as Gender) ?? undefined,
    color: String(r.color ?? ""),
    note: String(r.note ?? ""),
    x: Number(r.x) || 0,
    y: Number(r.y) || 0,
    createdAt: Number(r.created_at) || 0,
  };
}

function rowToRelation(r: Row): Relation {
  return {
    id: String(r.id),
    novelId: String(r.novel_id),
    sourceId: String(r.source_id),
    targetId: String(r.target_id),
    type: (r.type as RelationType) ?? "other",
    direction: (r.direction as Direction) ?? "one-way",
    note: String(r.note ?? ""),
    createdAt: Number(r.created_at) || 0,
  };
}

// ---------- 写入行构造 ----------

const NOVEL_COLS = [
  "id",
  "user_id",
  "title",
  "author",
  "synopsis",
  "theme_color",
  "created_at",
  "updated_at",
] as const;

const CHARACTER_COLS = [
  "id",
  "novel_id",
  "name",
  "alias",
  "role",
  "faction",
  "gender",
  "color",
  "note",
  "x",
  "y",
  "created_at",
] as const;

const RELATION_COLS = [
  "id",
  "novel_id",
  "source_id",
  "target_id",
  "type",
  "direction",
  "note",
  "created_at",
] as const;

function novelRow(n: Novel): Record<string, unknown> {
  return {
    id: n.id,
    user_id: n.userId,
    title: n.title,
    author: n.author,
    synopsis: n.synopsis,
    theme_color: n.themeColor,
    created_at: n.createdAt,
    updated_at: n.updatedAt,
  };
}

function characterRow(c: Character): Record<string, unknown> {
  return {
    id: c.id,
    novel_id: c.novelId,
    name: c.name,
    alias: c.alias ?? null,
    role: c.role,
    faction: c.faction,
    gender: c.gender ?? null,
    color: c.color,
    note: c.note,
    x: c.x,
    y: c.y,
    created_at: c.createdAt,
  };
}

function relationRow(r: Relation): Record<string, unknown> {
  return {
    id: r.id,
    novel_id: r.novelId,
    source_id: r.sourceId,
    target_id: r.targetId,
    type: r.type,
    direction: r.direction,
    note: r.note,
    created_at: r.createdAt,
  };
}

/** 生成 INSERT ... ON CONFLICT(id) DO UPDATE SET ...（全列覆盖，幂等 upsert）。 */
function insertSql(
  table: string,
  cols: readonly string[],
  rows: Record<string, unknown>[],
): string {
  const colList = cols.map((c) => ident(c)).join(", ");
  const valueRows = rows
    .map((row) => "(" + cols.map((c) => lit(row[c])).join(", ") + ")")
    .join(", ");
  const updateCols = cols
    .filter((c) => c !== "id")
    .map((c) => `${ident(c)} = EXCLUDED.${ident(c)}`)
    .join(", ");
  return `INSERT INTO ${ident(table)} (${colList}) VALUES ${valueRows} ON CONFLICT (${ident(
    "id",
  )}) DO UPDATE SET ${updateCols}`;
}

// ---------- 读 ----------

export async function fetchAll(
  db: PgDb,
  opts: { userId?: string | null } = {},
): Promise<RemoteSnapshot> {
  let sql = "SELECT * FROM " + ident("novels");
  if (opts.userId) sql += ` WHERE ${ident("user_id")} = ${lit(opts.userId)}`;
  sql += ` ORDER BY ${ident("updated_at")} DESC`;
  const novels = (await db.query(sql)).map(rowToNovel);
  if (novels.length === 0) return { novels: [], characters: [], relations: [] };
  const ids = novels.map((n) => n.id);
  const [characters, relations] = await Promise.all([
    db.query(
      `SELECT * FROM ${ident("characters")} WHERE ${ident("novel_id")} IN ${inList(ids)}`,
    ),
    db.query(
      `SELECT * FROM ${ident("relations")} WHERE ${ident("novel_id")} IN ${inList(ids)}`,
    ),
  ]);
  return {
    novels,
    characters: characters.map(rowToCharacter),
    relations: relations.map(rowToRelation),
  };
}

export async function listNovels(
  db: PgDb,
  opts: { userId?: string | null } = {},
): Promise<Novel[]> {
  let sql = "SELECT * FROM " + ident("novels");
  if (opts.userId) sql += ` WHERE ${ident("user_id")} = ${lit(opts.userId)}`;
  sql += ` ORDER BY ${ident("updated_at")} DESC`;
  return (await db.query(sql)).map(rowToNovel);
}

export async function fetchGraph(
  db: PgDb,
  novelId: string,
): Promise<NovelGraph | null> {
  const rows = await db.query(
    `SELECT * FROM ${ident("novels")} WHERE ${ident("id")} = ${lit(novelId)}`,
  );
  if (rows.length === 0) return null;
  const [characters, relations] = await Promise.all([
    db.query(
      `SELECT * FROM ${ident("characters")} WHERE ${ident("novel_id")} = ${lit(novelId)}`,
    ),
    db.query(
      `SELECT * FROM ${ident("relations")} WHERE ${ident("novel_id")} = ${lit(novelId)}`,
    ),
  ]);
  return {
    novel: rowToNovel(rows[0]),
    characters: characters.map(rowToCharacter),
    relations: relations.map(rowToRelation),
  };
}

export async function getCharacter(
  db: PgDb,
  id: string,
): Promise<Character | null> {
  const rows = await db.query(
    `SELECT * FROM ${ident("characters")} WHERE ${ident("id")} = ${lit(id)}`,
  );
  return rows.length ? rowToCharacter(rows[0]) : null;
}

export async function getRelation(
  db: PgDb,
  id: string,
): Promise<Relation | null> {
  const rows = await db.query(
    `SELECT * FROM ${ident("relations")} WHERE ${ident("id")} = ${lit(id)}`,
  );
  return rows.length ? rowToRelation(rows[0]) : null;
}

// ---------- 写：小说 ----------

export async function createNovel(
  db: PgDb,
  input: NovelInput,
  opts: { userId: string },
): Promise<Novel> {
  const now = Date.now();
  const novel: Novel = {
    id: uid("novel"),
    userId: opts.userId,
    title: input.title.trim() || "未命名",
    author: (input.author ?? "").trim(),
    synopsis: (input.synopsis ?? "").trim(),
    themeColor: input.themeColor ?? "vermillion",
    createdAt: now,
    updatedAt: now,
  };
  await db.query(insertSql("novels", NOVEL_COLS, [novelRow(novel)]));
  return novel;
}

export async function updateNovel(
  db: PgDb,
  id: string,
  patch: Partial<NovelInput>,
): Promise<void> {
  const sets: string[] = [];
  if (patch.title !== undefined)
    sets.push(`${ident("title")} = ${lit(patch.title.trim() || "未命名")}`);
  if (patch.author !== undefined)
    sets.push(`${ident("author")} = ${lit(patch.author.trim())}`);
  if (patch.synopsis !== undefined)
    sets.push(`${ident("synopsis")} = ${lit(patch.synopsis.trim())}`);
  if (patch.themeColor !== undefined)
    sets.push(`${ident("theme_color")} = ${lit(patch.themeColor)}`);
  sets.push(`${ident("updated_at")} = ${lit(Date.now())}`);
  if (sets.length === 0) return;
  await db.query(
    `UPDATE ${ident("novels")} SET ${sets.join(", ")} WHERE ${ident("id")} = ${lit(id)}`,
  );
}

export async function deleteNovel(db: PgDb, novelId: string): Promise<void> {
  await db.query(
    `DELETE FROM ${ident("relations")} WHERE ${ident("novel_id")} = ${lit(novelId)}`,
  );
  await db.query(
    `DELETE FROM ${ident("characters")} WHERE ${ident("novel_id")} = ${lit(novelId)}`,
  );
  await db.query(
    `DELETE FROM ${ident("novels")} WHERE ${ident("id")} = ${lit(novelId)}`,
  );
}

// ---------- 写：角色 ----------

export async function addCharacter(
  db: PgDb,
  novelId: string,
  input: CharacterInput,
): Promise<Character> {
  const character: Character = {
    id: uid("char"),
    novelId,
    name: input.name.trim() || "无名氏",
    alias: input.alias?.trim() || undefined,
    role: input.role,
    faction: input.faction,
    gender: input.gender,
    color: input.color,
    note: input.note,
    x: input.x,
    y: input.y,
    createdAt: Date.now(),
  };
  await db.query(insertSql("characters", CHARACTER_COLS, [characterRow(character)]));
  return character;
}

export async function updateCharacter(
  db: PgDb,
  id: string,
  patch: Partial<CharacterInput>,
): Promise<void> {
  const sets: string[] = [];
  if (patch.name !== undefined)
    sets.push(`${ident("name")} = ${lit(patch.name.trim() || "无名氏")}`);
  if (patch.alias !== undefined)
    sets.push(`${ident("alias")} = ${lit(patch.alias?.trim() || null)}`);
  if (patch.role !== undefined) sets.push(`${ident("role")} = ${lit(patch.role)}`);
  if (patch.faction !== undefined)
    sets.push(`${ident("faction")} = ${lit(patch.faction)}`);
  if (patch.gender !== undefined)
    sets.push(`${ident("gender")} = ${lit(patch.gender ?? null)}`);
  if (patch.color !== undefined) sets.push(`${ident("color")} = ${lit(patch.color)}`);
  if (patch.note !== undefined) sets.push(`${ident("note")} = ${lit(patch.note)}`);
  if (patch.x !== undefined) sets.push(`${ident("x")} = ${lit(patch.x)}`);
  if (patch.y !== undefined) sets.push(`${ident("y")} = ${lit(patch.y)}`);
  if (sets.length === 0) return;
  await db.query(
    `UPDATE ${ident("characters")} SET ${sets.join(", ")} WHERE ${ident("id")} = ${lit(id)}`,
  );
}

export async function removeCharacter(
  db: PgDb,
  novelId: string,
  id: string,
): Promise<void> {
  await db.query(
    `DELETE FROM ${ident("relations")} WHERE ${ident("novel_id")} = ${lit(
      novelId,
    )} AND (${ident("source_id")} = ${lit(id)} OR ${ident("target_id")} = ${lit(id)})`,
  );
  await db.query(
    `DELETE FROM ${ident("characters")} WHERE ${ident("novel_id")} = ${lit(
      novelId,
    )} AND ${ident("id")} = ${lit(id)}`,
  );
}

// ---------- 写：关系 ----------

export async function addRelation(
  db: PgDb,
  novelId: string,
  input: RelationInput,
): Promise<Relation> {
  const relation: Relation = {
    id: uid("rel"),
    novelId,
    sourceId: input.sourceId,
    targetId: input.targetId,
    type: input.type,
    direction: input.direction,
    note: input.note,
    createdAt: Date.now(),
  };
  await db.query(insertSql("relations", RELATION_COLS, [relationRow(relation)]));
  return relation;
}

export async function updateRelation(
  db: PgDb,
  id: string,
  patch: Partial<RelationInput>,
): Promise<void> {
  const sets: string[] = [];
  if (patch.sourceId !== undefined)
    sets.push(`${ident("source_id")} = ${lit(patch.sourceId)}`);
  if (patch.targetId !== undefined)
    sets.push(`${ident("target_id")} = ${lit(patch.targetId)}`);
  if (patch.type !== undefined) sets.push(`${ident("type")} = ${lit(patch.type)}`);
  if (patch.direction !== undefined)
    sets.push(`${ident("direction")} = ${lit(patch.direction)}`);
  if (patch.note !== undefined) sets.push(`${ident("note")} = ${lit(patch.note)}`);
  if (sets.length === 0) return;
  await db.query(
    `UPDATE ${ident("relations")} SET ${sets.join(", ")} WHERE ${ident("id")} = ${lit(id)}`,
  );
}

// ---------- 对账：云端为事实来源 ----------

export async function reconcileNovel(
  db: PgDb,
  novel: Novel,
  characters: Character[],
  relations: Relation[],
): Promise<NovelGraph> {
  // 同步即视为一次写操作：刷新 updatedAt 后幂等 upsert 小说本体。
  novel.updatedAt = Date.now();
  await db.query(insertSql("novels", NOVEL_COLS, [novelRow(novel)]));

  const keepCharIds = characters.map((c) => c.id);
  if (characters.length > 0) {
    await db.query(
      insertSql("characters", CHARACTER_COLS, characters.map(characterRow)),
    );
  }
  let delChars = `DELETE FROM ${ident("characters")} WHERE ${ident("novel_id")} = ${lit(
    novel.id,
  )}`;
  if (keepCharIds.length > 0)
    delChars += ` AND ${ident("id")} NOT IN ${inList(keepCharIds)}`;
  await db.query(delChars);

  const keepRelIds = relations.map((r) => r.id);
  if (relations.length > 0) {
    await db.query(
      insertSql("relations", RELATION_COLS, relations.map(relationRow)),
    );
  }
  let delRels = `DELETE FROM ${ident("relations")} WHERE ${ident("novel_id")} = ${lit(
    novel.id,
  )}`;
  if (keepRelIds.length > 0)
    delRels += ` AND ${ident("id")} NOT IN ${inList(keepRelIds)}`;
  await db.query(delRels);

  return { novel, characters, relations };
}
