import { app, clipboard, dialog, ipcMain, shell } from "electron";
import { downloadThumbnail, sanitizeThumbFileName } from "./thumbnail.js";
import { autoUpdater } from "./updater.js";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { buildPlaylistPayload, buildVideoPayload, thumbnailFromVideoJson } from "./formats.js";
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
  duplicateChoiceFromRenderer,
  getQueueState,
  pauseJob,
  removeJob,
  resumeJob,
} from "./queue.js";
import { normalizeVideoUrl } from "./url.js";
import { formatYtdlpUserMessage } from "./ytdlp-errors.js";
import {
  ensureYtdlp,
  getLatestYtdlpTag,
  getLocalYtdlpVersion,
  runYtdlp,
} from "./ytdlp.js";
import type { DuplicateChoice, HistoryRow } from "../../shared/ipc.js";

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
    if (code !== 0) throw new Error(formatYtdlpUserMessage(stderr, code));
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
      if (code !== 0) throw new Error(formatYtdlpUserMessage(stderr, code));
      return buildPlaylistPayload(stdout);
    },
  );

  ipcMain.handle("yt:fetchVideoThumb", async (_e, rawUrl: string) => {
    const url = rawUrl.trim();
    if (!url) return null;
    const { stdout, code } = await runYtdlp(
      ["-J", "--no-playlist", "--no-warnings", url],
      { maxBuffer: 40 * 1024 * 1024 },
    );
    if (code !== 0) return null;
    return thumbnailFromVideoJson(stdout);
  });

  ipcMain.handle(
    "thumbnail:saveAs",
    async (_e, payload: { url: string; defaultName: string }) => {
      const u = payload.url.trim();
      if (!u.startsWith("http")) return { ok: false as const, path: null as string | null };
      const name = sanitizeThumbFileName(payload.defaultName || "thumb.jpg");
      const r = await dialog.showSaveDialog({
        defaultPath: join(app.getPath("downloads"), name),
        filters: [
          { name: "Images", extensions: ["jpg", "jpeg", "png", "webp", "gif"] },
          { name: "All", extensions: ["*"] },
        ],
      });
      if (r.canceled || !r.filePath) return { ok: false as const, path: null as string | null };
      const ok = await downloadThumbnail(u, r.filePath);
      return { ok, path: r.filePath };
    },
  );

  ipcMain.handle(
    "thumbnails:saveBulkToFolder",
    async (_e, items: { url: string; fileName: string }[]) => {
      if (!items.length) return { ok: false as const, count: 0, folder: null as string | null };
      const r = await dialog.showOpenDialog({
        properties: ["openDirectory", "createDirectory"],
      });
      if (r.canceled || !r.filePaths[0]) return { ok: false as const, count: 0, folder: null };
      const folder = r.filePaths[0];
      let count = 0;
      for (const it of items) {
        const u = it.url.trim();
        if (!u.startsWith("http")) continue;
        const dest = join(folder, sanitizeThumbFileName(it.fileName));
        if (await downloadThumbnail(u, dest)) count++;
      }
      return { ok: true as const, count, folder };
    },
  );

  ipcMain.on(
    "duplicate:respond",
    (_e, p: { jobId: string; choice: DuplicateChoice }) => {
      duplicateChoiceFromRenderer(p.jobId, p.choice);
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
        thumbnailUrl?: string;
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
        thumbnailUrl?: string;
      },
    ) => {
      return addJob({ ...payload, mode: "end" });
    },
  );
  ipcMain.handle("queue:pause", (_e, id: string) => pauseJob(id));
  ipcMain.handle("queue:resume", (_e, id: string) => resumeJob(id));
  ipcMain.handle("queue:cancel", (_e, id: string) => cancelJob(id));
  ipcMain.handle("queue:clearCompleted", () => clearCompleted());
  ipcMain.handle("queue:remove", (_e, id: string) => removeJob(id));

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
      thumbnailPath: h.thumbnailPath,
    }));
  });
  ipcMain.handle("history:remove", (_e, id: string) => {
    const row = historyList().find((r) => r.id === id);
    if (row?.thumbnailPath && existsSync(row.thumbnailPath)) {
      try {
        unlinkSync(row.thumbnailPath);
      } catch {
        /* ignore */
      }
    }
    historyRemove(id);
  });
  ipcMain.handle("history:clear", () => {
    for (const h of historyList()) {
      if (h.thumbnailPath && existsSync(h.thumbnailPath)) {
        try {
          unlinkSync(h.thumbnailPath);
        } catch {
          /* ignore */
        }
      }
    }
    historyClear();
  });

  ipcMain.handle("media:readImageDataUrl", (_e, filePath: string) => {
    if (!filePath || !existsSync(filePath)) return null;
    const base = resolve(join(app.getPath("userData"), "thumbnails"));
    const abs = resolve(filePath);
    const rel = relative(base, abs);
    if (rel.startsWith("..") || rel === "" || rel.includes("..")) return null;
    const buf = readFileSync(abs);
    if (buf.length < 32) return null;
    const isPng = buf[0] === 0x89 && buf[1] === 0x50;
    const mime = isPng ? "image/png" : "image/jpeg";
    return `data:${mime};base64,${buf.toString("base64")}`;
  });

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
      const result = await autoUpdater.checkForUpdates();
      if (result == null || !result.isUpdateAvailable) {
        throw new Error(
          "No update is available. Use Check app update in Settings, then try again.",
        );
      }
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
