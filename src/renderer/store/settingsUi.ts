import { create } from "zustand";

type S = {
  clipboardWatch: boolean;
  autoFetch: boolean;
  notificationsPush: boolean;
  playlistFullThumbnails: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setClipboardWatch: (v: boolean) => Promise<void>;
  setAutoFetch: (v: boolean) => Promise<void>;
  setNotificationsPush: (v: boolean) => Promise<void>;
  setPlaylistFullThumbnails: (v: boolean) => Promise<void>;
};

export const useSettingsStore = create<S>((set) => ({
  clipboardWatch: false,
  autoFetch: false,
  notificationsPush: true,
  playlistFullThumbnails: false,
  hydrated: false,
  hydrate: async () => {
    try {
      const cw = (await window.omnidl.settingsGet("clipboardWatch")) === "1";
      const af = (await window.omnidl.settingsGet("autoFetch")) === "1";
      const np = (await window.omnidl.settingsGet("notificationsPush")) !== "0";
      const pft = (await window.omnidl.settingsGet("playlistFullThumbnails")) === "1";
      set({
        clipboardWatch: cw,
        autoFetch: af,
        notificationsPush: np,
        playlistFullThumbnails: pft,
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },
  setClipboardWatch: async (v) => {
    await window.omnidl.settingsSet("clipboardWatch", v ? "1" : "0");
    set({ clipboardWatch: v });
  },
  setAutoFetch: async (v) => {
    await window.omnidl.settingsSet("autoFetch", v ? "1" : "0");
    set({ autoFetch: v });
  },
  setNotificationsPush: async (v) => {
    await window.omnidl.settingsSet("notificationsPush", v ? "1" : "0");
    set({ notificationsPush: v });
  },
  setPlaylistFullThumbnails: async (v) => {
    await window.omnidl.settingsSet("playlistFullThumbnails", v ? "1" : "0");
    set({ playlistFullThumbnails: v });
  },
}));
