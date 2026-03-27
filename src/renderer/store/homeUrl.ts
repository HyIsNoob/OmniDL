import { create } from "zustand";

type S = {
  url: string;
  setUrl: (u: string) => void;
};

export const useHomeUrlStore = create<S>((set) => ({
  url: "",
  setUrl: (u) => set({ url: u }),
}));
