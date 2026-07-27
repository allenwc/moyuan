/**
 * 批量上传 weapp 字体到 CloudBase 云存储，并打印 HTTPS URL 清单。
 *
 * 用法：node weapp/scripts/upload-font.mjs
 * 依赖仓库根目录 .env.local：CLOUDBASE_ENV_ID / CLOUDBASE_SECRET_ID / CLOUDBASE_SECRET_KEY
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const CloudBase = require("@cloudbase/manager-node");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const fontsDir = path.join(root, "assets/fonts");

/** @type {{ file: string, cloudPath: string }[]} */
const FONTS = [
  { file: "NotoSerifSC-Bold.otf", cloudPath: "fonts/NotoSerifSC-Bold.otf" },
  { file: "NotoSerifSC-Regular.otf", cloudPath: "fonts/NotoSerifSC-Regular.otf" },
  { file: "NotoSansSC-Regular.otf", cloudPath: "fonts/NotoSansSC-Regular.otf" },
  { file: "NotoSansSC-Bold.otf", cloudPath: "fonts/NotoSansSC-Bold.otf" },
  { file: "CormorantGaramond-wght.ttf", cloudPath: "fonts/CormorantGaramond-wght.ttf" },
  {
    file: "CormorantGaramond-Italic-wght.ttf",
    cloudPath: "fonts/CormorantGaramond-Italic-wght.ttf",
  },
  { file: "MaShanZheng-Regular.ttf", cloudPath: "fonts/MaShanZheng-Regular.ttf" },
];

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

loadEnv(path.join(root, ".env.local"));

const secretId = process.env.CLOUDBASE_SECRET_ID;
const secretKey = process.env.CLOUDBASE_SECRET_KEY;
const envId = process.env.CLOUDBASE_ENV_ID;
if (!secretId || !secretKey || !envId) {
  console.error(
    "缺少 CLOUDBASE_ENV_ID / CLOUDBASE_SECRET_ID / CLOUDBASE_SECRET_KEY",
  );
  process.exit(1);
}

const app = CloudBase.init({ secretId, secretKey, envId });

async function ensurePublicRead() {
  const acl = await app.storage.getStorageAcl();
  console.log("当前存储 ACL:", acl);
  if (acl === "PRIVATE" || acl === "ADMINONLY") {
    console.log("将 ACL 设为 ADMINWRITE…");
    await app.storage.setStorageAcl("ADMINWRITE");
  }
}

function cdnUrl(cloudPath) {
  const { bucket } = app.storage.getStorageConfig();
  return `https://${bucket}.tcb.qcloud.la/${cloudPath}`;
}

async function main() {
  await ensurePublicRead();
  const urls = [];

  for (const item of FONTS) {
    const localPath = path.join(fontsDir, item.file);
    if (!fs.existsSync(localPath)) {
      console.warn("跳过（本地不存在）:", localPath);
      continue;
    }
    console.log("上传", item.file, "→", item.cloudPath);
    const result = await app.storage.uploadFile({
      localPath,
      cloudPath: item.cloudPath,
    });
    const url = cdnUrl(item.cloudPath);
    console.log("  OK", result?.statusCode || "", url);
    urls.push({ file: item.file, cloudPath: item.cloudPath, url });
  }

  console.log("\n=== FONT_FACES URL 清单 ===");
  for (const u of urls) {
    console.log(`${u.cloudPath}\n  ${u.url}`);
  }
  console.log(
    "\n提醒：微信后台需将 CDN 域名加入 downloadFile 合法域名。",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
