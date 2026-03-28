import { create } from "zustand";

export type FetchOverlayVariant = "default" | "silent";

type S = {
  active: boolean;
  label: string;
  variant: FetchOverlayVariant;
  setFetchOverlay: (active: boolean, label?: string, variant?: FetchOverlayVariant) => void;
};

export const useFetchOverlayStore = create<S>((set) => ({
  active: false,
  label: "",
  variant: "default",
  setFetchOverlay: (active, label = "", variant: FetchOverlayVariant = "default") =>
    set({
      active,
      label: active ? label || "Loading…" : "",
      variant: active ? variant : "default",
    }),
}));
