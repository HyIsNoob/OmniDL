import { create } from "zustand";

export type UpdatePhase = "available" | "downloading" | "ready" | "error";

export type UpdateProgress = {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
};

type S = {
  open: boolean;
  phase: UpdatePhase | null;
  version: string | null;
  progress: UpdateProgress | null;
  errorMessage: string | null;
  pendingInstall: boolean;
  openAvailable: (version: string) => void;
  startDownloading: () => void;
  setProgress: (p: UpdateProgress) => void;
  setReady: (version: string) => void;
  setError: (message: string) => void;
  closeModal: () => void;
  clearPendingInstall: () => void;
  reopenInstall: () => void;
};

export const useUpdateUiStore = create<S>((set) => ({
  open: false,
  phase: null,
  version: null,
  progress: null,
  errorMessage: null,
  pendingInstall: false,
  openAvailable: (version) =>
    set({
      open: true,
      phase: "available",
      version,
      progress: null,
      errorMessage: null,
    }),
  startDownloading: () =>
    set({
      phase: "downloading",
      progress: { percent: 0, bytesPerSecond: 0, transferred: 0, total: 0 },
      errorMessage: null,
    }),
  setProgress: (p) => set({ progress: p }),
  setReady: (version) =>
    set({
      open: true,
      phase: "ready",
      version,
      progress: null,
      errorMessage: null,
      pendingInstall: true,
    }),
  setError: (message) =>
    set({
      open: true,
      phase: "error",
      errorMessage: message,
      progress: null,
    }),
  closeModal: () => set({ open: false }),
  clearPendingInstall: () => set({ pendingInstall: false, phase: null, version: null }),
  reopenInstall: () =>
    set((state) => {
      if (state.pendingInstall && state.version) {
        return { open: true, phase: "ready" as const, errorMessage: null };
      }
      return {};
    }),
}));
