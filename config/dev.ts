import type { UserConfigExport } from "@tarojs/cli";

export default {
  logger: {
    quiet: false,
    stats: true,
  },
  mini: {},
  h5: {
    // 本地 H5 把 /api 转到 vercel dev（默认 3000）
    devServer: {
      host: "localhost",
      proxy: {
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
      },
    },
  },
} satisfies UserConfigExport<"webpack5">;
