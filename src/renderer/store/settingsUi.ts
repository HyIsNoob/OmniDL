import { create } from "zustand";

type S = {
  clipboardWatch: boolean;
  autoFetch: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setClipboardWatch: (v: boolean) => Promise<void>;
  setAutoFetch: (v: boolean) => Promise<void>;
};

export const useSettingsStore = create<S>((set) => ({
  clipboardWatch: false,
  autoFetch: false,
  hydrated: false,
  hydrate: async () => {
    const cw = (await window.omnidl.settingsGet("clipboardWatch")) === "1";
    const af = (await window.omnidl.settingsGet("autoFetch")) === "1";
    set({ clipboardWatch: cw, autoFetch: af, hydrated: true });
  },
  setClipboardWatch: async (v) => {
    await window.omnidl.settingsSet("clipboardWatch", v ? "1" : "0");
    set({ clipboardWatch: v });
  },
  setAutoFetch: async (v) => {
    await window.omnidl.settingsSet("autoFetch", v ? "1" : "0");
    set({ autoFetch: v });
  },
}));
