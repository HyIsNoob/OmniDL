import { existsSync } from "node:fs";
import { join } from "node:path";
import { BrowserWindow, Menu, app } from "electron";
import { autoUpdater } from "./updater.js";
import { initHeavyStorageAndMigrate } from "./user-data-path.js";
import { initDatabase, settingsGet } from "./db.js";
import { writeForceAdminBootstrap } from "./data-location-bootstrap.js";
import { maybeRelaunchElevatedAfterDbInit } from "./windows-elevate.js";
import { registerIpc } from "./ipc-register.js";
import { setQueueWindow } from "./queue.js";
import { ensureYtdlp, setBinDir } from "./ytdlp.js";

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let autoUpdaterListenersAttached = false;

function appIconPath(): string | undefined {
  const p = app.isPackaged
    ? join(process.resourcesPath, "favicon.ico")
    : join(__dirname, "../../favicon.ico");
  return existsSync(p) ? p : undefined;
}

function applyApplicationMenu(): void {
  if (process.platform === "darwin") {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        {
          label: app.name,
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" },
          ],
        },
        { role: "editMenu" },
      ]),
    );
  } else {
    Menu.setApplicationMenu(null);
  }
}

function splashHtml(msg: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>OmniDL</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=JetBrains+Mono:wght@600;700&display=swap" rel="stylesheet">
  <style>
  body{margin:0;background:#f5e6d3;color:#111;display:flex;align-items:center;justify-content:center;height:100vh;
  font-family:'JetBrains Mono','Cascadia Mono','Consolas','Courier New',monospace;font-weight:700;font-size:13px;line-height:1.45;letter-spacing:0.04em;}
  .box{border:4px solid #111;padding:24px 28px;background:#fffef8;box-shadow:6px 6px 0 #111;max-width:440px;text-transform:uppercase;}
  .brand{font-family:'Archivo Black','Arial Black','Helvetica Neue',Arial,sans-serif;font-size:11px;letter-spacing:0.2em;margin-bottom:12px;color:#111;}
  #m{font-feature-settings:"tnum" 1;}
  </style></head>
  <body><div class="box"><div class="brand">OmniDL</div><div id="m">${msg}</div></div></body></html>`;
}

async function showSplashAndEnsure(): Promise<BrowserWindow> {
  const icon = appIconPath();
  const splash = new BrowserWindow({
    width: 480,
    height: 200,
    frame: false,
    resizable: false,
    show: false,
    backgroundColor: "#f5e6d3",
    ...(icon ? { icon } : {}),
    webPreferences: { sandbox: true },
  });
  await splash.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml("Checking yt-dlp…"))}`);
  splash.show();
  try {
    await ensureYtdlp((line) => {
      void splash.webContents.executeJavaScript(
        `document.getElementById('m').textContent=${JSON.stringify(line)}`,
      );
    });
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    await splash.webContents.executeJavaScript(
      `document.getElementById('m').textContent=${JSON.stringify("yt-dlp: " + err)}`,
    );
    await new Promise((r) => setTimeout(r, 2000));
  }
  return splash;
}

function createMainWindow(): void {
  const icon = appIconPath();
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,
    minWidth: 900,
    minHeight: 640,
    show: false,
    backgroundColor: "#f5e6d3",
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  setQueueWindow(mainWindow);
  mainWindow.once("ready-to-show", () => {
    mainWindow?.maximize();
    mainWindow?.show();
  });
  mainWindow.webContents.once("did-finish-load", () => {
    if (!isDev && app.isPackaged && !autoUpdaterListenersAttached) {
      autoUpdaterListenersAttached = true;
      autoUpdater.autoDownload = false;
      let pendingUpdateVersion: string | null = null;
      const broadcast = (channel: string, payload: object) => {
        for (const w of BrowserWindow.getAllWindows()) {
          if (!w.isDestroyed()) {
            w.webContents.send(channel, payload);
          }
        }
      };
      autoUpdater.on("update-available", (info) => {
        pendingUpdateVersion = info.version;
        broadcast("updater:available", { version: info.version });
      });
      autoUpdater.on("download-progress", (e) => {
        broadcast("updater:progress", {
          percent: e.percent,
          bytesPerSecond: e.bytesPerSecond,
          transferred: e.transferred,
          total: e.total,
        });
      });
      autoUpdater.on("update-downloaded", (info) => {
        const v =
          (info as { version?: string }).version ?? pendingUpdateVersion ?? "";
        broadcast("updater:downloaded", { version: v });
      });
      autoUpdater.on("error", (err) => {
        broadcast("updater:error", { message: err.message });
      });
      void autoUpdater.checkForUpdates().catch(() => undefined);
    }
  });
  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  applyApplicationMenu();
  setBinDir(initHeavyStorageAndMigrate());
  await initDatabase(app.getPath("userData"));
  writeForceAdminBootstrap(settingsGet("dataLocationForceAdmin") === "1");
  if (maybeRelaunchElevatedAfterDbInit()) {
    return;
  }
  registerIpc(isDev);
  const splash = await showSplashAndEnsure();
  createMainWindow();
  splash.destroy();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
