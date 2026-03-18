import { resolve } from "node:path";
import type { UserConfig } from "vite";

const rootDir = __dirname;
const generatedDir = resolve(rootDir, "extension/generated");

const config: UserConfig = {
  build: {
    cssCodeSplit: false,
    emptyOutDir: false,
    lib: {
      cssFileName: "data-manager",
      entry: resolve(rootDir, "extension/src-ts/pages/data-manager/main.ts"),
      fileName: function () {
        return "data-manager.js";
      },
      formats: ["es"]
    },
    minify: false,
    outDir: generatedDir,
    sourcemap: false,
    target: "chrome109"
  }
};

export default config;
