/**
 * 把 开放 API 的 Hono app（api/src/app.ts，含 @moyuan/core）打包成
 * CloudBase 云函数可 require 的 CJS bundle。
 * 产物：cloudfunctions/api/app.bundle.cjs（hono / @cloudbase/manager-node /
 * jsonwebtoken 保持 external，由云函数 installDependency 安装）。
 */
import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 本脚本位于 cloudfunctions/api/ 下，仓库根 = 上两级
const root = path.resolve(__dirname, "../..");

await esbuild.build({
  entryPoints: [path.join(root, "cloudfunctions/api/src/app.ts")],
  bundle: true,
  format: "cjs",
  platform: "node",
  target: ["node20"],
  external: ["hono", "@cloudbase/manager-node", "jsonwebtoken"],
  outfile: path.join(root, "cloudfunctions/api/app.bundle.cjs"),
  logLevel: "info",
});

console.log("bundled → cloudfunctions/api/app.bundle.cjs");
