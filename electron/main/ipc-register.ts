import { app, clipboard, dialog, ipcMain, shell } from "electron";
import { autoUpdater } from "./updater.js";
import { existsSync } from "node:fs";
import { buildPlaylistPayload, buildVideoPayload } from "./formats.js";
import {
  historyClear,
  historyList,
  historyRemove,
  settingsGet,
  settingsSet,
} from "./db.js";
import {
  addJob,
  cancelJob,
  clearCompleted,
  getQueueState,
  pauseJob,
  resumeJob,
} from "./queue.js";
import { normalizeVideoUrl } from "./url.js";
import {
  ensureYtdlp,
  getLatestYtdlpTag,
  getLocalYtdlpVersion,
  runYtdlp,
} from "./ytdlp.js";
import type { HistoryRow } from "../../shared/ipc.js";

export function registerIpc(isDev: boolean): void {
  ipcMain.handle("app:getVersion", () => app.getVersion());
  ipcMain.handle("paths:downloads", () => app.getPath("downloads"));

  ipcMain.handle("url:normalize", (_e, url: string) => normalizeVideoUrl(url));

  ipcMain.handle("ytdlp:getVersion", async () => getLocalYtdlpVersion());
  ipcMain.handle("ytdlp:getRemoteTag", async () => getLatestYtdlpTag());
  ipcMain.handle("ytdlp:ensure", async () => {
    await ensureYtdlp();
    return getLocalYtdlpVersion();
  });

  ipcMain.handle("yt:fetchVideo", async (_e, rawUrl: string) => {
    const url = normalizeVideoUrl(rawUrl.trim());
    if (!url) throw new Error("Empty URL");
    const { stdout, stderr, code } = await runYtdlp(
      ["-J", "--no-playlist", "--no-warnings", url],
      { maxBuffer: 80 * 1024 * 1024 },
    );
    if (code !== 0) throw new Error(stderr || `yt-dlp failed (${code})`);
    return buildVideoPayload(stdout);
  });

  ipcMain.handle(
    "yt:fetchPlaylist",
    async (_e, payload: { url: string; limit: number }) => {
      const url = payload.url.trim();
      if (!url) throw new Error("Empty URL");
      const lim = Math.min(100, Math.max(1, payload.limit || 50));
      const { stdout, stderr, code } = await runYtdlp(
        ["-J", "--flat-playlist", "--playlist-end", String(lim), "--no-warnings", url],
        { maxBuffer: 80 * 1024 * 1024 },
      );
      if (code !== 0) throw new Error(stderr || `yt-dlp failed (${code})`);
      return buildPlaylistPayload(stdout);
    },
  );

  ipcMain.handle("queue:getState", () => getQueueState());
  ipcMain.handle(
    "queue:addDownload",
    (
      _e,
      payload: {
        url: string;
        title: string;
        formatLabel: string;
        formatSelector: string;
        outputDir: string;
        kind: "video" | "audio";
        platform?: string;
      },
    ) => {
      return addJob({ ...payload, mode: "next" });
    },
  );
  ipcMain.handle(
    "queue:addToQueue",
    (
      _e,
      payload: {
        url: string;
        title: string;
        formatLabel: string;
        formatSelector: string;
        outputDir: string;
        kind: "video" | "audio";
        platform?: string;
      },
    ) => {
      return addJob({ ...payload, mode: "end" });
    },
  );
  ipcMain.handle("queue:pause", (_e, id: string) => pauseJob(id));
  ipcMain.handle("queue:resume", (_e, id: string) => resumeJob(id));
  ipcMain.handle("queue:cancel", (_e, id: string) => cancelJob(id));
  ipcMain.handle("queue:clearCompleted", () => clearCompleted());

  ipcMain.handle("settings:get", (_e, key: string) => settingsGet(key));
  ipcMain.handle("settings:set", (_e, key: string, value: string) => {
    settingsSet(key, value);
  });

  ipcMain.handle("history:list", (): HistoryRow[] => {
    return historyList().map((h) => ({
      id: h.id,
      url: h.url,
      title: h.title,
      platform: h.platform,
      mediaPath: h.mediaPath,
      quality: h.quality,
      kind: h.kind as "video" | "audio",
      createdAt: h.createdAt,
      exists: existsSync(h.mediaPath),
    }));
  });
  ipcMain.handle("history:remove", (_e, id: string) => historyRemove(id));
  ipcMain.handle("history:clear", () => historyClear());

  ipcMain.handle("dialog:openDirectory", async () => {
    const r = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
    });
    if (r.canceled || !r.filePaths[0]) return null;
    return r.filePaths[0];
  });

  ipcMain.handle("shell:showItemInFolder", (_e, p: string) => {
    shell.showItemInFolder(p);
  });
  ipcMain.handle("shell:openPath", (_e, p: string) => shell.openPath(p));

  ipcMain.handle("clipboard:read", () => clipboard.readText());

  if (!isDev) {
    ipcMain.handle("updater:check", async () => {
      const r = await autoUpdater.checkForUpdates();
      return { version: r?.updateInfo?.version ?? null };
    });
    ipcMain.handle("updater:download", async () => {
      await autoUpdater.downloadUpdate();
    });
    ipcMain.handle("updater:quitAndInstall", () => {
      autoUpdater.quitAndInstall(false, true);
    });
  } else {
    ipcMain.handle("updater:check", async () => ({ version: null as string | null }));
    ipcMain.handle("updater:download", async () => undefined);
    ipcMain.handle("updater:quitAndInstall", () => undefined);
  }
}
