import { create } from "zustand";

export type HomeFetchPhase = "idle" | "fetching" | "success" | "error";

type S = {
  phase: HomeFetchPhase;
  inFlight: boolean;
  setFetching: () => void;
  setFetchSuccess: () => void;
  setFetchError: () => void;
  dismiss: () => void;
  release: () => void;
};

export const useHomeFetchUiStore = create<S>((set) => ({
  phase: "idle",
  inFlight: false,
  setFetching: () => set({ phase: "fetching", inFlight: true }),
  setFetchSuccess: () => set({ phase: "success", inFlight: false }),
  setFetchError: () => set({ phase: "error", inFlight: false }),
  dismiss: () => set({ phase: "idle" }),
  release: () => set({ phase: "idle", inFlight: false }),
}));
