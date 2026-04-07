import { readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { BrowserWindow, app, shell } from "electron";
import { closeDatabase, initDatabase } from "./db.js";

const CHROMIUM_CACHE_DIR_NAMES = new Set([
  "Cache",
  "Code Cache",
  "GPUCache",
  "DawnCache",
]);

function pathSize(p: string): number {
  try {
    const st = statSync(p);
    if (st.isFile()) return st.size;
    if (!st.isDirectory()) return 0;
    let total = 0;
    for (const name of readdirSync(p)) {
      total += pathSize(join(p, name));
    }
    return total;
  } catch {
    return 0;
  }
}

export function getTotalUserDataBytes(): number {
  return pathSize(app.getPath("userData"));
}

export function getCleanableStorageBytes(): number {
  const root = app.getPath("userData");
  let total = 0;
  for (const name of ["omnidl.db", "omnidl.db-wal", "omnidl.db-shm", "thumbnails"]) {
    total += pathSize(join(root, name));
  }
  try {
    for (const name of readdirSync(root)) {
      if (CHROMIUM_CACHE_DIR_NAMES.has(name)) {
        total += pathSize(join(root, name));
      }
    }
  } catch {
    /* ignore */
  }
  return total;
}

export function getAppStorageStats(): { cleanable: number; total: number } {
  return { cleanable: getCleanableStorageBytes(), total: getTotalUserDataBytes() };
}

export function openUserDataFolder(): void {
  void shell.openPath(app.getPath("userData"));
}

export async function clearCleanableAppStorage(sender: Electron.WebContents): Promise<void> {
  const root = app.getPath("userData");
  await closeDatabase();
  for (const name of ["omnidl.db", "omnidl.db-wal", "omnidl.db-shm", "thumbnails"]) {
    try {
      rmSync(join(root, name), { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
  try {
    for (const name of readdirSync(root)) {
      if (CHROMIUM_CACHE_DIR_NAMES.has(name)) {
        try {
          rmSync(join(root, name), { recursive: true, force: true });
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore */
  }
  await initDatabase(root);
  const win = BrowserWindow.fromWebContents(sender);
  win?.reload();
}
