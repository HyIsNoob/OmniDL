import { createRequire } from "node:module";
import type { AppUpdater } from "electron-updater";

const require = createRequire(import.meta.url);
const eu = require("electron-updater") as { autoUpdater: AppUpdater };

export const autoUpdater = eu.autoUpdater;
