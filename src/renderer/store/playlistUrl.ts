import { create } from "zustand";

export const usePlaylistUrlStore = create<{
  url: string;
  setUrl: (s: string) => void;
}>((set) => ({
  url: "",
  setUrl: (url) => set({ url }),
}));
