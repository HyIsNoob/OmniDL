import { create } from "zustand";
import type { TabId } from "@shared/ipc";
import { TAB_COVER_MS, TAB_EXIT_MS } from "../lib/tabTransition";
import { useSettingsStore } from "./settingsUi";

const TAB_ORDER: TabId[] = [
  "home",
  "queue",
  "playlist",
  "history",
  "instruction",
  "options",
];

function tabIndex(t: TabId): number {
  return TAB_ORDER.indexOf(t);
}

export const TAB_TRANSITION_LABEL: Record<TabId, string> = {
  home: "HOME",
  queue: "QUEUE",
  playlist: "PLAYLIST",
  history: "HISTORY",
  options: "OPTIONS",
  instruction: "GUIDE",
};

export type TabSweep = "up" | "down";

type AppState = {
  tab: TabId;
  overlayOn: boolean;
  sweep: TabSweep;
  transitionLabel: string;
  transitionLocked: boolean;
  setTab: (t: TabId) => void;
};

export const useAppStore = create<AppState>((set, get) => ({
  tab: "home",
  overlayOn: false,
  sweep: "down",
  transitionLabel: "",
  transitionLocked: false,
  setTab: (t) => {
    if (t === get().tab) return;
    const reduced = useSettingsStore.getState().animationLevel === "reduced";
    if (reduced) {
      set({ tab: t, overlayOn: false, transitionLocked: false });
      return;
    }
    if (get().transitionLocked) return;
    const prev = tabIndex(get().tab);
    const next = tabIndex(t);
    const sweep: TabSweep = next < prev ? "up" : "down";
    set({
      overlayOn: true,
      sweep,
      transitionLabel: TAB_TRANSITION_LABEL[t],
      transitionLocked: true,
    });
    window.setTimeout(() => {
      set({ tab: t, overlayOn: false });
      window.setTimeout(() => {
        set({ transitionLocked: false });
      }, TAB_EXIT_MS);
    }, TAB_COVER_MS);
  },
}));
