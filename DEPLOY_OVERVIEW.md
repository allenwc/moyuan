# 部署总结 — auth 云函数（邮箱登录 4043 根因修复）

## 做了什么
应你要求**直接通过 CloudBase CLI 完成了 `auth` 云函数的部署**，并端到端验证登录通过。

## 关键修复
小程序邮箱登录此前手搓明文 `POST /auth/v1/signin`，被 CloudBase 拒绝（4043 `INVALID_USERNAME_OR_PASSWORD`）；H5 用 js-sdk 自动 RSA 加密所以能登。
修复：云函数邮箱分支改用 `@cloudbase/js-sdk` 的 `signInWithEmailAndPassword` + `getUserInfo()` 取 uid，与 H5 同一链路。

## 部署过程踩的坑
1. **本地 `node_modules` 被根 workspace 污染到 529MB**（混入 vite/tailwind/lucide 等），直接上传必超 50MB 上限。
2. 解决：新增 `cloudfunctions/auth/.cloudbaseignore` 忽略 `node_modules` + 移走本地污染包，让 tcb 走「云端自动安装依赖（COS 上传）」，上传包仅源码 ~15KB。
3. tcb CLI 全局安装（bin 名 `tcb`），用 `.env.local` 的密钥登录调用。

## 验证结果 ✅
`tcb fn invoke auth` 用 `allenwc / Wc1985502` 登录 → 返回 `uid=2080087231943426049`（= 书库 `novels.user_id`）→ 账号打通生效。

## 你还要做的两件事
1. **微信开发者工具重新上传/编译小程序**（settings 页 + novelStore `{{uid}}` 改动）——云端已能正确注入 uid，但真机要跑新前端。
2. ⚠️ **轮换云端 `SESSION_SECRET`**：控制台「云函数 → auth → 环境变量」改为 `openssl rand -hex 32` 新值，改完我可再帮你 deploy 一次生效。
