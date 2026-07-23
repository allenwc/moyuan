import { defineConfig, type UserConfigExport } from "@tarojs/cli";
import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import { UnifiedWebpackPluginV5 } from "weapp-tailwindcss/webpack";
import path from "node:path";
import devConfig from "./dev";
import prodConfig from "./prod";

export default defineConfig<"webpack5">(async (merge) => {
  const baseConfig: UserConfigExport<"webpack5"> = {
    projectName: "moyuan",
    date: "2026-7-22",
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2,
    },
    sourceRoot: "src",
    outputRoot: `dist/${process.env.TARO_ENV}`,
    plugins: ["@tarojs/plugin-html"],
    /**
     * 必须预先声明这些键（可为空字符串）。
     * Taro 会把 config.env 打进 webpack DefinePlugin：`process.env.KEY` → 字面量。
     * 未声明时 H5 会残留裸 `process`，报 process is not defined。
     * 真实值来自仓库根目录 `.env` / `.env.local` 的 TARO_APP_*（CLI 启动时自动 patch）。
     */
    env: {
      TARO_APP_API_BASE: JSON.stringify(""),
      TARO_APP_DEV_BYPASS: JSON.stringify(""),
      TARO_APP_CLOUDBASE_ENV_ID: JSON.stringify(""),
    },
    defineConstants: {},
    copy: {
      patterns: [],
      options: {},
    },
    framework: "react",
    compiler: {
      type: "webpack5",
      prebundle: {
        webpack: {},
      },
    },
    cache: {
      enable: false,
    },
    alias: {
      "@": path.resolve(__dirname, "..", "src"),
      "@moyuan/core": path.resolve(
        __dirname,
        "..",
        "packages/core/src/index.ts",
      ),
    },
    mini: {
      compile: {
        include: [path.resolve(__dirname, "..", "packages/core")],
      },
      postcss: {
        pxtransform: {
          enable: true,
          config: {},
        },
        cssModules: {
          enable: false,
          config: {
            namingPattern: "module",
            generateScopedName: "[name]__[local]___[hash:base64:5]",
          },
        },
      },
      webpackChain(chain) {
        chain.resolve.plugin("tsconfig-paths").use(TsconfigPathsPlugin);
        // 小程序不需要 react-dom，用空模块替代（节省约 280KB）
        chain.resolve.alias.set("react-dom", false);
        chain.resolve.alias.set("react-dom/client", false);
        // 把 Tailwind 转义选择器（\/ \. \[ 等）转成 WXSS 可编译形式
        chain.merge({
          plugin: {
            install: {
              plugin: UnifiedWebpackPluginV5,
              args: [
                {
                  appType: "taro",
                  rem2rpx: true,
                },
              ],
            },
          },
        });
      },
    },
    h5: {
      publicPath: "/",
      staticDirectory: "static",
      compile: {
        include: [path.resolve(__dirname, "..", "packages/core")],
      },
      router: {
        mode: "hash",
      },
      output: {
        filename: "js/[name].[hash:8].js",
        chunkFilename: "js/[name].[chunkhash:8].js",
      },
      miniCssExtractPluginOption: {
        ignoreOrder: true,
        filename: "css/[name].[hash].css",
        chunkFilename: "css/[name].[chunkhash].css",
      },
      postcss: {
        autoprefixer: {
          enable: true,
          config: {},
        },
        // H5 与 Vite 同源 UI：保留 CSS px/rem，不做 750 设计稿换算
        pxtransform: {
          enable: false,
        },
        cssModules: {
          enable: false,
          config: {
            namingPattern: "module",
            generateScopedName: "[name]__[local]___[hash:base64:5]",
          },
        },
      },
      webpackChain(chain) {
        chain.resolve.plugin("tsconfig-paths").use(TsconfigPathsPlugin);
      },
    },
  };

  if (process.env.NODE_ENV === "development") {
    return merge({}, baseConfig, devConfig);
  }
  return merge({}, baseConfig, prodConfig);
});
