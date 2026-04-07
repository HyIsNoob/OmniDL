import { create } from "zustand";

export type AnimationLevel = "full" | "reduced";

type S = {
  clipboardWatch: boolean;
  autoFetch: boolean;
  notificationsPush: boolean;
  playlistFullThumbnails: boolean;
  animationLevel: AnimationLevel;
  notifyBatchThreshold: number;
  queueConcurrency: 1 | 2 | 3;
  hydrated: boolean;
  settingsSavedNotice: string | null;
  hydrate: () => Promise<void>;
  setClipboardWatch: (v: boolean) => Promise<void>;
  setAutoFetch: (v: boolean) => Promise<void>;
  setNotificationsPush: (v: boolean) => Promise<void>;
  setPlaylistFullThumbnails: (v: boolean) => Promise<void>;
  setAnimationLevel: (v: AnimationLevel) => Promise<void>;
  setNotifyBatchThreshold: (n: number) => Promise<void>;
  setQueueConcurrency: (n: 1 | 2 | 3) => Promise<void>;
};

const SAVED_MS = 2200;

function flashSaved(set: (partial: Partial<S>) => void): void {
  set({ settingsSavedNotice: "Settings saved" });
  window.setTimeout(() => set({ settingsSavedNotice: null }), SAVED_MS);
}

export const useSettingsStore = create<S>((set) => ({
  clipboardWatch: false,
  autoFetch: false,
  notificationsPush: true,
  playlistFullThumbnails: false,
  animationLevel: "full",
  notifyBatchThreshold: 5,
  queueConcurrency: 1,
  hydrated: false,
  settingsSavedNotice: null,
  hydrate: async () => {
    try {
      const cw = (await window.omnidl.settingsGet("clipboardWatch")) === "1";
      const af = (await window.omnidl.settingsGet("autoFetch")) === "1";
      const np = (await window.omnidl.settingsGet("notificationsPush")) !== "0";
      const pft = (await window.omnidl.settingsGet("playlistFullThumbnails")) === "1";
      const al = await window.omnidl.settingsGet("animationLevel");
      const animationLevel: AnimationLevel = al === "reduced" ? "reduced" : "full";
      const nbtRaw = await window.omnidl.settingsGet("notifyBatchThreshold");
      const nbt =
        nbtRaw != null && nbtRaw !== ""
          ? Math.max(0, Math.min(1000, parseInt(nbtRaw, 10) || 5))
          : 5;
      const qcRaw = await window.omnidl.settingsGet("queueConcurrency");
      const qcNum = qcRaw != null && qcRaw !== "" ? parseInt(qcRaw, 10) : 1;
      const queueConcurrency = (qcNum >= 2 && qcNum <= 3 ? qcNum : 1) as 1 | 2 | 3;
      set({
        clipboardWatch: cw,
        autoFetch: af,
        notificationsPush: np,
        playlistFullThumbnails: pft,
        animationLevel,
        notifyBatchThreshold: nbt,
        queueConcurrency,
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },
  setClipboardWatch: async (v) => {
    await window.omnidl.settingsSet("clipboardWatch", v ? "1" : "0");
    set({ clipboardWatch: v });
    flashSaved(set);
  },
  setAutoFetch: async (v) => {
    await window.omnidl.settingsSet("autoFetch", v ? "1" : "0");
    set({ autoFetch: v });
    flashSaved(set);
  },
  setNotificationsPush: async (v) => {
    await window.omnidl.settingsSet("notificationsPush", v ? "1" : "0");
    set({ notificationsPush: v });
    flashSaved(set);
  },
  setPlaylistFullThumbnails: async (v) => {
    await window.omnidl.settingsSet("playlistFullThumbnails", v ? "1" : "0");
    set({ playlistFullThumbnails: v });
    flashSaved(set);
  },
  setAnimationLevel: async (v) => {
    await window.omnidl.settingsSet("animationLevel", v === "reduced" ? "reduced" : "full");
    set({ animationLevel: v });
    flashSaved(set);
  },
  setNotifyBatchThreshold: async (n) => {
    const v = Math.max(0, Math.min(1000, Math.floor(n)));
    await window.omnidl.settingsSet("notifyBatchThreshold", String(v));
    set({ notifyBatchThreshold: v });
    flashSaved(set);
  },
  setQueueConcurrency: async (n) => {
    await window.omnidl.settingsSet("queueConcurrency", String(n));
    set({ queueConcurrency: n });
    flashSaved(set);
  },
}));
