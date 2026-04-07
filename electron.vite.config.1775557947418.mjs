// electron.vite.config.ts
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
var __electron_vite_injected_dirname = "D:\\fileluu\\Tools\\OmniDL";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__electron_vite_injected_dirname, "electron/main/index.ts")
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__electron_vite_injected_dirname, "electron/preload/index.ts")
      }
    }
  },
  renderer: {
    root: resolve(__electron_vite_injected_dirname, "src/renderer"),
    plugins: [react()],
    resolve: {
      alias: {
        "@": resolve(__electron_vite_injected_dirname, "src/renderer"),
        "@shared": resolve(__electron_vite_injected_dirname, "shared")
      }
    },
    build: {
      rollupOptions: {
        input: resolve(__electron_vite_injected_dirname, "src/renderer/index.html")
      }
    }
  }
});
export {
  electron_vite_config_default as default
};
