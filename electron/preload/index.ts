import { contextBridge, ipcRenderer } from "electron";
import type {
  HistoryRow,
  PlaylistInfoPayload,
  QueueJob,
  QueueState,
  VideoInfoPayload,
} from "../../shared/ipc.js";

const api = {
  getVersion: () => ipcRenderer.invoke("app:getVersion") as Promise<string>,
  pathsDownloads: () => ipcRenderer.invoke("paths:downloads") as Promise<string>,
  normalizeUrl: (url: string) => ipcRenderer.invoke("url:normalize", url) as Promise<string>,
  ytdlpGetVersion: () => ipcRenderer.invoke("ytdlp:getVersion") as Promise<string | null>,
  ytdlpGetRemoteTag: () => ipcRenderer.invoke("ytdlp:getRemoteTag") as Promise<string>,
  ytdlpEnsure: () => ipcRenderer.invoke("ytdlp:ensure") as Promise<string | null>,
  fetchVideo: (url: string) => ipcRenderer.invoke("yt:fetchVideo", url) as Promise<VideoInfoPayload>,
  fetchPlaylist: (url: string, limit: number) =>
    ipcRenderer.invoke("yt:fetchPlaylist", { url, limit }) as Promise<PlaylistInfoPayload>,
  queueGetState: () => ipcRenderer.invoke("queue:getState") as Promise<QueueState>,
  queueAddDownload: (payload: {
    url: string;
    title: string;
    formatLabel: string;
    formatSelector: string;
    outputDir: string;
    kind: "video" | "audio";
    platform?: string;
    thumbnailUrl?: string;
  }) => ipcRenderer.invoke("queue:addDownload", payload) as Promise<QueueJob>,
  queueAddToQueue: (payload: {
    url: string;
    title: string;
    formatLabel: string;
    formatSelector: string;
    outputDir: string;
    kind: "video" | "audio";
    platform?: string;
    thumbnailUrl?: string;
  }) => ipcRenderer.invoke("queue:addToQueue", payload) as Promise<QueueJob>,
  queuePause: (id: string) => ipcRenderer.invoke("queue:pause", id),
  queueResume: (id: string) => ipcRenderer.invoke("queue:resume", id),
  queueCancel: (id: string) => ipcRenderer.invoke("queue:cancel", id),
  queueClearCompleted: () => ipcRenderer.invoke("queue:clearCompleted"),
  settingsGet: (key: string) => ipcRenderer.invoke("settings:get", key) as Promise<string | null>,
  settingsSet: (key: string, value: string) => ipcRenderer.invoke("settings:set", key, value),
  historyList: () => ipcRenderer.invoke("history:list") as Promise<HistoryRow[]>,
  historyRemove: (id: string) => ipcRenderer.invoke("history:remove", id),
  historyClear: () => ipcRenderer.invoke("history:clear"),
  readImageDataUrl: (filePath: string) =>
    ipcRenderer.invoke("media:readImageDataUrl", filePath) as Promise<string | null>,
  openDirectory: () => ipcRenderer.invoke("dialog:openDirectory") as Promise<string | null>,
  showItemInFolder: (p: string) => ipcRenderer.invoke("shell:showItemInFolder", p),
  openPath: (p: string) => ipcRenderer.invoke("shell:openPath", p),
  readClipboard: () => ipcRenderer.invoke("clipboard:read") as Promise<string>,
  updaterCheck: () => ipcRenderer.invoke("updater:check") as Promise<{ version: string | null }>,
  updaterDownload: () => ipcRenderer.invoke("updater:download"),
  updaterQuitAndInstall: () => ipcRenderer.invoke("updater:quitAndInstall"),
  onQueueUpdate: (cb: (s: QueueState) => void) => {
    const fn = (_: unknown, s: QueueState) => cb(s);
    ipcRenderer.on("queue:update", fn);
    return () => ipcRenderer.removeListener("queue:update", fn);
  },
  onDownloadDone: (cb: (p: { title: string; path: string }) => void) => {
    const fn = (_: unknown, p: { title: string; path: string }) => cb(p);
    ipcRenderer.on("download:done", fn);
    return () => ipcRenderer.removeListener("download:done", fn);
  },
  onUpdaterAvailable: (cb: (p: { version: string }) => void) => {
    const fn = (_: unknown, p: { version: string }) => cb(p);
    ipcRenderer.on("updater:available", fn);
    return () => ipcRenderer.removeListener("updater:available", fn);
  },
  onUpdaterDownloaded: (cb: () => void) => {
    const fn = () => cb();
    ipcRenderer.on("updater:downloaded", fn);
    return () => ipcRenderer.removeListener("updater:downloaded", fn);
  },
};

export type OmnidlApi = typeof api;

declare global {
  interface Window {
    omnidl: OmnidlApi;
  }
}

contextBridge.exposeInMainWorld("omnidl", api);
