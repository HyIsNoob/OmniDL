import { mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { app } from "electron";

const PORTABLE_DIR_NAME = "omnidl-data";

export function applyPortableUserDataPath(): void {
  if (!app.isPackaged) return;
  const root = join(dirname(process.execPath), PORTABLE_DIR_NAME);
  try {
    mkdirSync(root, { recursive: true });
    const test = join(root, ".omnidl-write-test");
    writeFileSync(test, "1", "utf8");
    unlinkSync(test);
    app.setPath("userData", root);
  } catch {
    /* keep default userData (e.g. AppData\Roaming\...) */
  }
}

export function getPortableTargetPath(): string {
  if (!app.isPackaged) return app.getPath("userData");
  return join(dirname(process.execPath), PORTABLE_DIR_NAME);
}

export function isPortableUserDataActive(): boolean {
  if (!app.isPackaged) return false;
  const portable = getPortableTargetPath();
  try {
    return (
      app.getPath("userData").replace(/\\/g, "/").toLowerCase() ===
      portable.replace(/\\/g, "/").toLowerCase()
    );
  } catch {
    return false;
  }
}
