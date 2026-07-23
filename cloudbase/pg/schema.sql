-- 墨缘 · CloudBase PostgreSQL 数据模型
-- 通过 @cloudbase/manager-node 的 executePGSql 执行原生 SQL。
-- 鉴权为自建会话（JWT），无 RLS；按 user_id 在应用层实现数据隔离。

CREATE TABLE IF NOT EXISTS users (
  id                varchar(64) PRIMARY KEY,
  email             varchar(255) UNIQUE,
  password_hash     text,
  wechat_openid     varchar(64) UNIQUE,
  wechat_unionid    varchar(64),
  wechat_stable_key varchar(128) UNIQUE,
  channel           varchar(16),
  created_at        bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS novels (
  id          varchar(64) PRIMARY KEY,
  user_id     varchar(64) NOT NULL,
  title       text NOT NULL,
  author      text NOT NULL DEFAULT '',
  synopsis    text NOT NULL DEFAULT '',
  theme_color varchar(16) NOT NULL DEFAULT 'vermillion',
  created_at  bigint NOT NULL,
  updated_at  bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_novels_user_id ON novels (user_id);

CREATE TABLE IF NOT EXISTS characters (
  id        varchar(64) PRIMARY KEY,
  novel_id  varchar(64) NOT NULL,
  name      text NOT NULL,
  alias     text,
  role      text NOT NULL DEFAULT '',
  faction   text NOT NULL DEFAULT '',
  gender    text,
  color     text NOT NULL DEFAULT '',
  note      text NOT NULL DEFAULT '',
  x         double precision NOT NULL DEFAULT 0,
  y         double precision NOT NULL DEFAULT 0,
  created_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_characters_novel_id ON characters (novel_id);

CREATE TABLE IF NOT EXISTS relations (
  id         varchar(64) PRIMARY KEY,
  novel_id   varchar(64) NOT NULL,
  source_id  varchar(64) NOT NULL,
  target_id  varchar(64) NOT NULL,
  type       text NOT NULL DEFAULT 'other',
  direction  text NOT NULL DEFAULT 'one-way',
  note       text NOT NULL DEFAULT '',
  created_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_relations_novel_id ON relations (novel_id);
