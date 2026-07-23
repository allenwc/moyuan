import type { UserConfigExport } from "@tarojs/cli";

export default {
  mini: {
    webpackChain(chain) {
      chain.optimization.minimize(true);
    },
  },
  h5: {
    webpackChain(chain) {
      chain.optimization.minimize(true);
    },
  },
} satisfies UserConfigExport<"webpack5">;
