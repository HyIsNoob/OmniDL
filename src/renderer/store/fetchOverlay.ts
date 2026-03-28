import { create } from "zustand";

type S = {
  active: boolean;
  label: string;
  setFetchOverlay: (active: boolean, label?: string) => void;
};

export const useFetchOverlayStore = create<S>((set) => ({
  active: false,
  label: "",
  setFetchOverlay: (active, label = "") =>
    set({ active, label: active ? label || "Loading…" : "" }),
}));
