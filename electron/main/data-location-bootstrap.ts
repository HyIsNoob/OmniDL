import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { app } from "electron";

const BOOTSTRAP_NAME = ".omnidl-force-admin";
const PORTABLE_DIR_NAME = "omnidl-data";

export function getRoamingUserDataPath(): string {
  return join(app.getPath("appData"), app.getName());
}

export function getPortableDataDir(): string {
  return join(dirname(process.execPath), PORTABLE_DIR_NAME);
}

function readBootstrapAt(path: string): boolean | null {
  try {
    if (!existsSync(path)) return null;
    return readFileSync(path, "utf8").trim() === "1";
  } catch {
    return null;
  }
}

export function readForceAdminBootstrap(): boolean {
  const roaming = join(getRoamingUserDataPath(), BOOTSTRAP_NAME);
  const portable = join(getPortableDataDir(), BOOTSTRAP_NAME);
  const r = readBootstrapAt(roaming);
  if (r != null) return r;
  const p = readBootstrapAt(portable);
  if (p != null) return p;
  return false;
}

export function writeForceAdminBootstrap(enabled: boolean): void {
  try {
    const roamingDir = getRoamingUserDataPath();
    mkdirSync(roamingDir, { recursive: true });
    const roamingFile = join(roamingDir, BOOTSTRAP_NAME);
    if (enabled) {
      writeFileSync(roamingFile, "1", "utf8");
    } else if (existsSync(roamingFile)) {
      unlinkSync(roamingFile);
    }
  } catch {
    /* ignore */
  }
  if (!app.isPackaged) return;
  try {
    const portableDir = getPortableDataDir();
    mkdirSync(portableDir, { recursive: true });
    const portableFile = join(portableDir, BOOTSTRAP_NAME);
    if (enabled) {
      writeFileSync(portableFile, "1", "utf8");
    } else if (existsSync(portableFile)) {
      unlinkSync(portableFile);
    }
  } catch {
    /* ignore */
  }
}
