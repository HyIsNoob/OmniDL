import { existsSync, mkdirSync, cpSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";
import { readForceAdminBootstrap } from "./data-location-bootstrap.js";
import { isWindowsProcessElevated } from "./windows-elevate.js";

const PORTABLE_DIR_NAME = "omnidl-data";

let heavyStoragePathCache = "";

function canWriteDir(dir: string): boolean {
  try {
    const p = join(dir, ".omnidl-write-test");
    writeFileSync(p, "1");
    unlinkSync(p);
    return true;
  } catch {
    return false;
  }
}

function safeRemoveDir(dir: string): void {
  try {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
  } catch {
    /* ignore */
  }
}

function copyHeavyDirsIfMissing(from: string, to: string): void {
  try {
    mkdirSync(to, { recursive: true });
  } catch {
    /* ignore */
  }
  for (const name of ["bin", "ffmpeg-bin"]) {
    const src = join(from, name);
    const dst = join(to, name);
    if (!existsSync(src)) continue;
    if (existsSync(dst)) continue;
    try {
      cpSync(src, dst, { recursive: true });
    } catch {
      /* ignore */
    }
  }
}

function pruneHeavyDirsOnly(roamingOrSource: string): void {
  for (const name of ["bin", "ffmpeg-bin"]) {
    safeRemoveDir(join(roamingOrSource, name));
  }
}

function portableHasHeavyBins(portableRoot: string): boolean {
  const exe = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
  return existsSync(join(portableRoot, "bin", exe));
}

export function initHeavyStorageAndMigrate(): string {
  if (!app.isPackaged) {
    const roaming = app.getPath("userData");
    heavyStoragePathCache = roaming;
    return roaming;
  }

  const roaming = app.getPath("userData");
  const portableRoot = join(dirname(process.execPath), PORTABLE_DIR_NAME);

  const forceAdmin = readForceAdminBootstrap();
  const elevated = process.platform === "win32" && isWindowsProcessElevated();

  try {
    mkdirSync(portableRoot, { recursive: true });
  } catch {
    /* ignore */
  }

  const portableWritable =
    canWriteDir(portableRoot) ||
    (process.platform === "win32" && forceAdmin && elevated);

  if (portableWritable) {
    copyHeavyDirsIfMissing(roaming, portableRoot);
    if (portableHasHeavyBins(portableRoot)) {
      pruneHeavyDirsOnly(roaming);
    }
    heavyStoragePathCache = portableRoot;
    return portableRoot;
  }

  copyHeavyDirsIfMissing(portableRoot, roaming);
  if (portableHasHeavyBins(roaming)) {
    pruneHeavyDirsOnly(portableRoot);
  }
  heavyStoragePathCache = roaming;
  return roaming;
}

export function getHeavyStoragePath(): string {
  if (!heavyStoragePathCache) {
    throw new Error("Heavy storage not initialized");
  }
  return heavyStoragePathCache;
}

export function getPortableTargetPath(): string {
  if (!app.isPackaged) return app.getPath("userData");
  return join(dirname(process.execPath), PORTABLE_DIR_NAME);
}

export function isHeavyDataOnPortable(): boolean {
  if (!app.isPackaged) return false;
  const portable = getPortableTargetPath();
  try {
    return getHeavyStoragePath().replace(/\\/g, "/").toLowerCase() === portable.replace(/\\/g, "/").toLowerCase();
  } catch {
    return false;
  }
}
