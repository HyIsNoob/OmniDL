import { create } from "zustand";
import type { PlaylistInfoPayload, VideoInfoPayload } from "@shared/ipc";

export type PlaylistMode = "480" | "bestv" | "besta";

type S = {
  homeVideo: VideoInfoPayload | null;
  homeFetchedUrl: string | null;
  homeSelId: string | null;
  homeKind: "video" | "audio";
  homeAudioSel: string;

  playlistData: PlaylistInfoPayload | null;
  playlistFetchedUrl: string | null;
  playlistFetchedLimit: number;
  playlistMode: PlaylistMode;
  playlistSelectedIds: string[];
  playlistThumbRefinedIds: string[];
  playlistThumbRefineDone: boolean;

  setHomeSession: (p: {
    homeVideo: VideoInfoPayload;
    homeFetchedUrl: string;
    homeSelId: string | null;
    homeKind?: "video" | "audio";
    homeAudioSel?: string;
  }) => void;
  patchHomeVideo: (video: VideoInfoPayload) => void;
  setHomeSelId: (id: string | null) => void;
  setHomeKind: (k: "video" | "audio") => void;
  setHomeAudioSel: (id: string) => void;
  clearHomeSession: () => void;

  setPlaylistData: (data: PlaylistInfoPayload | null) => void;
  setPlaylistMeta: (p: {
    playlistFetchedUrl: string;
    playlistFetchedLimit: number;
  }) => void;
  setPlaylistMode: (m: PlaylistMode) => void;
  setPlaylistSelectedIds: (ids: string[]) => void;
  patchPlaylistEntryThumb: (id: string, thumbnail: string) => void;
  addPlaylistThumbRefined: (id: string) => void;
  setPlaylistThumbRefineDone: (v: boolean) => void;
  resetPlaylistThumbRefine: () => void;
  clearPlaylistSession: () => void;
};

export const useSessionFetchStore = create<S>((set) => ({
  homeVideo: null,
  homeFetchedUrl: null,
  homeSelId: null,
  homeKind: "video",
  homeAudioSel: "best-audio",

  playlistData: null,
  playlistFetchedUrl: null,
  playlistFetchedLimit: 50,
  playlistMode: "bestv",
  playlistSelectedIds: [],
  playlistThumbRefinedIds: [],
  playlistThumbRefineDone: true,

  setHomeSession: (p) =>
    set({
      homeVideo: p.homeVideo,
      homeFetchedUrl: p.homeFetchedUrl,
      homeSelId: p.homeSelId,
      homeKind: p.homeKind ?? "video",
      homeAudioSel: p.homeAudioSel ?? "best-audio",
    }),
  patchHomeVideo: (video) => set({ homeVideo: video }),
  setHomeSelId: (id) => set({ homeSelId: id }),
  setHomeKind: (k) => set({ homeKind: k }),
  setHomeAudioSel: (id) => set({ homeAudioSel: id }),
  clearHomeSession: () =>
    set({
      homeVideo: null,
      homeFetchedUrl: null,
      homeSelId: null,
      homeKind: "video",
      homeAudioSel: "best-audio",
    }),

  setPlaylistData: (data) => set({ playlistData: data }),
  setPlaylistMeta: (p) =>
    set({ playlistFetchedUrl: p.playlistFetchedUrl, playlistFetchedLimit: p.playlistFetchedLimit }),
  setPlaylistMode: (m) => set({ playlistMode: m }),
  setPlaylistSelectedIds: (ids) => set({ playlistSelectedIds: ids }),
  patchPlaylistEntryThumb: (id, thumbnail) =>
    set((st) => {
      if (!st.playlistData) return st;
      return {
        playlistData: {
          ...st.playlistData,
          entries: st.playlistData.entries.map((e) =>
            e.id === id ? { ...e, thumbnail } : e,
          ),
        },
      };
    }),
  addPlaylistThumbRefined: (id) =>
    set((st) =>
      st.playlistThumbRefinedIds.includes(id)
        ? st
        : { playlistThumbRefinedIds: [...st.playlistThumbRefinedIds, id] },
    ),
  setPlaylistThumbRefineDone: (v) => set({ playlistThumbRefineDone: v }),
  resetPlaylistThumbRefine: () =>
    set({ playlistThumbRefinedIds: [], playlistThumbRefineDone: false }),
  clearPlaylistSession: () =>
    set((st) => ({
      playlistData: null,
      playlistFetchedUrl: null,
      playlistFetchedLimit: 50,
      playlistMode: st.playlistMode,
      playlistSelectedIds: [],
      playlistThumbRefinedIds: [],
      playlistThumbRefineDone: true,
    })),
}));
