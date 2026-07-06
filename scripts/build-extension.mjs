import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "vite";

const generatedDir = resolve(process.cwd(), "extension/generated");
const watchMode = process.argv.includes("--watch");

rmSync(generatedDir, { force: true, recursive: true });

function createBaseBuildConfig() {
  return {
    build: {
      emptyOutDir: false,
      minify: false,
      outDir: generatedDir,
      sourcemap: false,
      target: "chrome109",
      watch: watchMode ? {} : undefined
    }
  };
}

const buildConfigs = [
  {
    ...createBaseBuildConfig(),
    build: {
      ...createBaseBuildConfig().build,
      cssCodeSplit: false,
      lib: {
        cssFileName: "data-manager",
        entry: resolve(process.cwd(), "extension/src-ts/pages/data-manager/main.ts"),
        fileName() {
          return "data-manager.js";
        },
        formats: ["es"]
      }
    }
  },
  {
    ...createBaseBuildConfig(),
    build: {
      ...createBaseBuildConfig().build,
      lib: {
        entry: resolve(process.cwd(), "extension/src-ts/bridges/offline-form-snapshot-global.ts"),
        fileName() {
          return "offline-form-snapshot-api.js";
        },
        formats: ["iife"],
        name: "ChromeTestDataOfflineFormSnapshotBundle"
      }
    }
  },
  {
    ...createBaseBuildConfig(),
    build: {
      ...createBaseBuildConfig().build,
      lib: {
        entry: resolve(process.cwd(), "extension/src-ts/bridges/data-records-global.ts"),
        fileName() {
          return "data-records-api.js";
        },
        formats: ["iife"],
        name: "ChromeTestDataDataRecordsBundle"
      }
    }
  },
  {
    ...createBaseBuildConfig(),
    build: {
      ...createBaseBuildConfig().build,
      lib: {
        entry: resolve(process.cwd(), "extension/src-ts/bridges/data-manager-bridge.ts"),
        fileName() {
          return "data-manager-bridge.js";
        },
        formats: ["iife"],
        name: "ChromeTestDataDataManagerBridgeBundle"
      }
    }
  }
];

for (const config of buildConfigs) {
  await build(config);
}
