import { execSync, spawn } from "node:child_process";
import { app } from "electron";
import { settingsGet } from "./db.js";

export function isWindowsProcessElevated(): boolean {
  if (process.platform !== "win32") return false;
  try {
    execSync("net session", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function relaunchSelfElevatedWindows(): void {
  const exe = process.execPath.replace(/'/g, "''");
  spawn(
    "powershell.exe",
    [
      "-NoProfile",
      "-WindowStyle",
      "Hidden",
      "-Command",
      `Start-Process -FilePath '${exe}' -Verb RunAs`,
    ],
    { detached: true, stdio: "ignore" },
  );
}

export function relaunchSelfNormalWindows(): void {
  spawn("explorer.exe", [process.execPath], { detached: true, stdio: "ignore" });
}

export function maybeRelaunchElevatedAfterDbInit(): boolean {
  if (!app.isPackaged || process.platform !== "win32") return false;
  if (settingsGet("dataLocationForceAdmin") !== "1") return false;
  if (isWindowsProcessElevated()) return false;
  relaunchSelfElevatedWindows();
  setTimeout(() => {
    app.exit(0);
  }, 120);
  return true;
}
