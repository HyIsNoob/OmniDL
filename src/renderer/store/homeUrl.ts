import { create } from "zustand";

type S = {
  url: string;
  fetchHandoffUrl: string | null;
  setUrl: (u: string) => void;
  setFetchHandoff: (u: string) => void;
  takeFetchHandoff: () => string | null;
};

export const useHomeUrlStore = create<S>((set, get) => ({
  url: "",
  fetchHandoffUrl: null,
  setUrl: (u) => set({ url: u }),
  setFetchHandoff: (u) => set({ fetchHandoffUrl: u }),
  takeFetchHandoff: () => {
    const v = get().fetchHandoffUrl;
    set({ fetchHandoffUrl: null });
    return v;
  },
}));
