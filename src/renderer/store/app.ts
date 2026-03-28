import { create } from "zustand";
import type { TabId } from "@shared/ipc";

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
  setTab: (t: TabId) => void;
};

export const useAppStore = create<AppState>((set, get) => ({
  tab: "home",
  overlayOn: false,
  sweep: "down",
  transitionLabel: "",
  setTab: (t) => {
    if (t === get().tab) return;
    const prev = tabIndex(get().tab);
    const next = tabIndex(t);
    const sweep: TabSweep = next < prev ? "up" : "down";
    set({
      overlayOn: true,
      sweep,
      transitionLabel: TAB_TRANSITION_LABEL[t],
    });
    window.setTimeout(() => {
      set({ tab: t });
      window.setTimeout(() => set({ overlayOn: false }), 380);
    }, 90);
  },
}));
