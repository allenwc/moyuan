/**
 * 将 @moyuan/core 打包为小程序可 require 的 CJS。
 * 用法：node weapp/scripts/bundle-core.mjs
 */
import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

await esbuild.build({
  entryPoints: [path.join(root, "packages/core/src/index.ts")],
  bundle: true,
  format: "cjs",
  platform: "neutral",
  target: ["es2018"],
  outfile: path.join(root, "weapp/vendor/core.js"),
  logLevel: "info",
});

console.log("bundled → weapp/vendor/core.js");
