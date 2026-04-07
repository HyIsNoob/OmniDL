import { existsSync, mkdirSync, cpSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { app } from "electron";

const PORTABLE_DIR_NAME = "omnidl-data";

function tryCopyIfExists(from: string, to: string): void {
  if (!existsSync(from)) return;
  cpSync(from, to, { recursive: true });
}

function migrateLegacyToPortable(legacyRoot: string, portableRoot: string): void {
  if (existsSync(join(portableRoot, "omnidl.db"))) return;
  if (!existsSync(join(legacyRoot, "omnidl.db"))) return;
  try {
    tryCopyIfExists(join(legacyRoot, "omnidl.db"), join(portableRoot, "omnidl.db"));
    tryCopyIfExists(join(legacyRoot, "omnidl.db-wal"), join(portableRoot, "omnidl.db-wal"));
    tryCopyIfExists(join(legacyRoot, "omnidl.db-shm"), join(portableRoot, "omnidl.db-shm"));
    tryCopyIfExists(join(legacyRoot, "thumbnails"), join(portableRoot, "thumbnails"));
    tryCopyIfExists(join(legacyRoot, "bin"), join(portableRoot, "bin"));
    tryCopyIfExists(join(legacyRoot, "ffmpeg-bin"), join(portableRoot, "ffmpeg-bin"));
  } catch {
    /* ignore */
  }
}

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

export function applyPortableUserDataPath(): void {
  if (!app.isPackaged) return;
  const legacyRoot = app.getPath("userData");
  const exeDir = dirname(process.execPath);
  const portableRoot = join(exeDir, PORTABLE_DIR_NAME);
  try {
    mkdirSync(portableRoot, { recursive: true });
  } catch {
    return;
  }
  if (!canWriteDir(portableRoot)) return;
  migrateLegacyToPortable(legacyRoot, portableRoot);
  try {
    app.setPath("userData", portableRoot);
  } catch {
    /* keep default */
  }
}

export function getPortableTargetPath(): string {
  if (!app.isPackaged) return app.getPath("userData");
  return join(dirname(process.execPath), PORTABLE_DIR_NAME);
}

export function isUsingPortableDataPath(): boolean {
  if (!app.isPackaged) return false;
  const active = getPortableTargetPath();
  const current = app.getPath("userData");
  return active.replace(/\\/g, "/").toLowerCase() === current.replace(/\\/g, "/").toLowerCase();
}
