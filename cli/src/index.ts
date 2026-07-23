#!/usr/bin/env node
import { Command } from "commander";
import type {
  CharacterInput,
  RelationInput,
  ThemeColor,
} from "@moyuan/core";

/**
 * 墨缘 CLI —— 通过 REST API 操作小说人物关系图谱。
 * 配置：MOYUAN_API_URL（默认 http://localhost:3000/api）、MOYUAN_API_KEY、
 * 可选 MOYUAN_USER_ID（API Key 模式下创建/列表过滤/对账归属用户）。
 * Agent / 脚本可通过 stdout 的 JSON 输出进行管道处理。
 */

const program = new Command();

program
  .name("moyuan")
  .description("墨缘 · 小说人物关系图谱 CLI")
  .version("0.1.0");

function apiBase(): string {
  const url = process.env.MOYUAN_API_URL ?? "http://localhost:3000/api";
  return url.replace(/\/+$/, "");
}

function headers(): Record<string, string> {
  const key = process.env.MOYUAN_API_KEY;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (key) h["Authorization"] = `Bearer ${key}`;
  return h;
}

async function req<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    method,
    headers: headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : text) || res.statusText;
    throw new Error(`[${res.status}] ${msg}`);
  }
  return data as T;
}

function out(value: unknown): void {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
}

function num(v: string | undefined, fallback: number): number {
  if (v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// ---------- novel ----------
const novel = program.command("novel").description("管理小说");

novel
  .command("list")
  .description("列出小说（API Key 可用 --user 过滤）")
  .option("-u, --user <userId>", "按用户过滤（或环境变量 MOYUAN_USER_ID）")
  .action(async (opts) => {
    const userId = opts.user || process.env.MOYUAN_USER_ID;
    const path = userId
      ? `/novels?userId=${encodeURIComponent(userId)}`
      : "/novels";
    const r = await req<{ novels: unknown[] }>("GET", path);
    out(r.novels);
  });

novel
  .command("create")
  .description("新建小说（API Key 模式必须指定归属用户）")
  .requiredOption("-t, --title <title>", "小说标题")
  .option("-a, --author <author>", "作者")
  .option("-s, --synopsis <synopsis>", "简介")
  .option("-c, --theme <theme>", "主题色")
  .option("-u, --user <userId>", "归属用户 id（或环境变量 MOYUAN_USER_ID）")
  .action(async (opts) => {
    const userId = opts.user || process.env.MOYUAN_USER_ID;
    if (!userId) {
      throw new Error("API Key 创建小说需 --user <userId> 或设置 MOYUAN_USER_ID");
    }
    const r = await req<{ novel: unknown }>("POST", "/novels", {
      title: opts.title,
      author: opts.author,
      synopsis: opts.synopsis,
      themeColor: opts.theme as ThemeColor | undefined,
      userId,
    });
    out(r.novel);
  });

novel
  .command("get <id>")
  .description("获取小说完整图谱（小说 + 角色 + 关系）")
  .action(async (id: string) => {
    const r = await req("GET", `/novels/${id}`);
    out(r);
  });

novel
  .command("update <id>")
  .description("更新小说信息")
  .option("-t, --title <title>", "小说标题")
  .option("-a, --author <author>", "作者")
  .option("-s, --synopsis <synopsis>", "简介")
  .option("-c, --theme <theme>", "主题色")
  .action(async (id: string, opts) => {
    const patch: Record<string, unknown> = {};
    if (opts.title !== undefined) patch.title = opts.title;
    if (opts.author !== undefined) patch.author = opts.author;
    if (opts.synopsis !== undefined) patch.synopsis = opts.synopsis;
    if (opts.theme !== undefined) patch.themeColor = opts.theme;
    const r = await req("PUT", `/novels/${id}`, patch);
    out(r);
  });

novel
  .command("delete <id>")
  .description("删除小说（含其角色与关系）")
  .action(async (id: string) => {
    const r = await req("DELETE", `/novels/${id}`);
    out(r);
  });

// ---------- character ----------
const character = program.command("character").description("管理角色");

character
  .command("add <novelId>")
  .description("新增角色")
  .requiredOption("-n, --name <name>", "姓名")
  .option("--alias <alias>", "别名")
  .option("-r, --role <role>", "身份", "")
  .option("-f, --faction <faction>", "阵营", "")
  .option("-c, --color <color>", "颜色", "#a8322d")
  .option("--note <note>", "备注", "")
  .option("-x <x>", "画布 X 坐标", "0")
  .option("-y <y>", "画布 Y 坐标", "0")
  .action(async (novelId: string, opts) => {
    const body: CharacterInput = {
      name: opts.name,
      alias: opts.alias,
      role: opts.role,
      faction: opts.faction,
      color: opts.color,
      note: opts.note,
      x: num(opts.x, 0),
      y: num(opts.y, 0),
    };
    const r = await req<{ character: unknown }>(
      "POST",
      `/novels/${novelId}/characters`,
      body,
    );
    out(r.character);
  });

character
  .command("update <novelId> <charId>")
  .description("更新角色")
  .option("-n, --name <name>", "姓名")
  .option("--alias <alias>", "别名")
  .option("-r, --role <role>", "身份")
  .option("-f, --faction <faction>", "阵营")
  .option("-c, --color <color>", "颜色")
  .option("--note <note>", "备注")
  .option("-x <x>", "画布 X 坐标")
  .option("-y <y>", "画布 Y 坐标")
  .action(async (novelId: string, charId: string, opts) => {
    const patch: Record<string, unknown> = {};
    if (opts.name !== undefined) patch.name = opts.name;
    if (opts.alias !== undefined) patch.alias = opts.alias;
    if (opts.role !== undefined) patch.role = opts.role;
    if (opts.faction !== undefined) patch.faction = opts.faction;
    if (opts.color !== undefined) patch.color = opts.color;
    if (opts.note !== undefined) patch.note = opts.note;
    if (opts.x !== undefined) patch.x = num(opts.x, 0);
    if (opts.y !== undefined) patch.y = num(opts.y, 0);
    const r = await req("PUT", `/novels/${novelId}/characters/${charId}`, patch);
    out(r);
  });

character
  .command("remove <novelId> <charId>")
  .description("删除角色（及其关系）")
  .action(async (novelId: string, charId: string) => {
    const r = await req("DELETE", `/novels/${novelId}/characters/${charId}`);
    out(r);
  });

// ---------- relation ----------
const relation = program.command("relation").description("管理关系");

relation
  .command("add <novelId>")
  .description("新增关系")
  .requiredOption("--source <source>", "源角色 id")
  .requiredOption("--target <target>", "目标角色 id")
  .requiredOption("--type <type>", "关系类型")
  .option("--direction <direction>", "方向 one-way|mutual", "mutual")
  .option("--note <note>", "备注", "")
  .action(async (novelId: string, opts) => {
    const body: RelationInput = {
      sourceId: opts.source,
      targetId: opts.target,
      type: opts.type,
      direction: opts.direction,
      note: opts.note,
    };
    const r = await req<{ relation: unknown }>(
      "POST",
      `/novels/${novelId}/relations`,
      body,
    );
    out(r.relation);
  });

relation
  .command("update <novelId> <relId>")
  .description("更新关系")
  .option("--source <source>", "源角色 id")
  .option("--target <target>", "目标角色 id")
  .option("--type <type>", "关系类型")
  .option("--direction <direction>", "方向 one-way|mutual")
  .option("--note <note>", "备注")
  .action(async (novelId: string, relId: string, opts) => {
    const patch: Record<string, unknown> = {};
    if (opts.source !== undefined) patch.sourceId = opts.source;
    if (opts.target !== undefined) patch.targetId = opts.target;
    if (opts.type !== undefined) patch.type = opts.type;
    if (opts.direction !== undefined) patch.direction = opts.direction;
    if (opts.note !== undefined) patch.note = opts.note;
    const r = await req("PUT", `/novels/${novelId}/relations/${relId}`, patch);
    out(r);
  });

relation
  .command("remove <novelId> <relId>")
  .description("删除关系")
  .action(async (novelId: string, relId: string) => {
    const r = await req("DELETE", `/novels/${novelId}/relations/${relId}`);
    out(r);
  });

// ---------- graph / reconcile ----------
program
  .command("graph <id>")
  .description("输出某本小说的完整图谱 JSON")
  .action(async (id: string) => {
    const r = await req("GET", `/novels/${id}`);
    out(r);
  });

program
  .command("reconcile <id>")
  .description("提交整本小说的完整状态（从文件或 stdin 读取 JSON）")
  .option("-f, --file <file>", "JSON 文件路径（省略则从 stdin 读取）")
  .action(async (id: string, opts) => {
    let raw: string;
    if (opts.file) {
      raw = await import("node:fs/promises").then((fs) =>
        fs.readFile(opts.file, "utf8"),
      );
    } else {
      raw = await new Promise<string>((resolve, reject) => {
        let data = "";
        process.stdin.setEncoding("utf8");
        process.stdin.on("data", (c) => (data += c));
        process.stdin.on("end", () => resolve(data));
        process.stdin.on("error", reject);
      });
    }
    const body = JSON.parse(raw) as {
      novel?: { userId?: string };
      characters?: unknown;
      relations?: unknown;
    };
    const userId = process.env.MOYUAN_USER_ID;
    if (userId && body.novel && !body.novel.userId) {
      body.novel.userId = userId;
    } else if (userId && !body.novel) {
      body.novel = { userId };
    }
    const r = await req("POST", `/novels/${id}/reconcile`, body);
    out(r);
  });

program.parseAsync(process.argv).catch((err) => {
  process.stderr.write((err instanceof Error ? err.message : String(err)) + "\n");
  process.exit(1);
});
