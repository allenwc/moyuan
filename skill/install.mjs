#!/usr/bin/env node
// 分发安装脚本：npx moyuan-skill 时，把本 skill 复制到用户级
// ~/.codebuddy/skills/moyuan/，使其在 CodeBuddy 中被自动发现。
import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_NAME = "moyuan";
const target = join(homedir(), ".codebuddy", "skills", SKILL_NAME);

mkdirSync(dirname(target), { recursive: true });
// 覆盖式复制整个 skill 目录
cpSync(__dirname, target, { recursive: true, force: true });

console.log(`已安装 skill 到: ${target}`);
console.log(`重启/重新加载 CodeBuddy 后，"moyuan" skill 即可在对话中使用。`);
