import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FolderOpen, ListVideo, Loader2, Plus } from "lucide-react";
import type { PlaylistEntry, PlaylistInfoPayload } from "@shared/ipc";
import { BrutalPanel } from "../components/BrutalPanel";
import { usePlaylistUrlStore } from "../store/playlistUrl";
import { useSettingsStore } from "../store/settingsUi";

const btnHover =
  "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";

type PlMode = "480" | "bestv" | "besta";

function selectorFor(mode: PlMode): { label: string; formatSelector: string; kind: "video" | "audio" } {
  if (mode === "480")
    return {
      label: "480p",
      formatSelector: "bestvideo[height<=480]+bestaudio/best[height<=480]",
      kind: "video",
    };
  if (mode === "bestv")
    return { label: "Best video", formatSelector: "bestvideo+bestaudio/best", kind: "video" };
  return { label: "Best audio", formatSelector: "bestaudio/best", kind: "audio" };
}

export function Playlist() {
  const url = usePlaylistUrlStore((s) => s.url);
  const setUrl = usePlaylistUrlStore((s) => s.setUrl);
  const playlistFullThumbnails = useSettingsStore((s) => s.playlistFullThumbnails);
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<PlaylistInfoPayload | null>(null);
  const [mode, setMode] = useState<PlMode>("bestv");
  const [outDir, setOutDir] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [fetchKey, setFetchKey] = useState(0);
  const [refineSnapshot, setRefineSnapshot] = useState<PlaylistEntry[] | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    void (async () => {
      const d = await window.omnidl.settingsGet("downloadDir");
      if (d) setOutDir(d);
      else setOutDir(await window.omnidl.pathsDownloads());
      const l = await window.omnidl.settingsGet("playlistLimit");
      if (l) setLimit(Number(l) || 50);
    })();
  }, []);

  useEffect(() => {
    const d = dataRef.current;
    if (!d) return;
    setSelected(new Set(d.entries.map((e) => e.id)));
  }, [fetchKey]);

  useEffect(() => {
    if (!playlistFullThumbnails || !refineSnapshot?.length) return;
    let cancelled = false;
    void (async () => {
      for (const e of refineSnapshot) {
        if (cancelled) return;
        const t = await window.omnidl.fetchVideoThumb(e.url);
        if (t && !cancelled) {
          setData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              entries: prev.entries.map((x) => (x.id === e.id ? { ...x, thumbnail: t } : x)),
            };
          });
        }
        await new Promise((r) => setTimeout(r, 120));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refineSnapshot, playlistFullThumbnails]);

  const load = async () => {
    setErr(null);
    setLoading(true);
    setData(null);
    setRefineSnapshot(null);
    try {
      const lim = Math.min(100, Math.max(1, limit));
      await window.omnidl.settingsSet("playlistLimit", String(lim));
      const pl = await window.omnidl.fetchPlaylist(url.trim(), lim);
      setData(pl);
      setRefineSnapshot(pl.entries);
      setFetchKey((k) => k + 1);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const pickDir = async () => {
    const p = await window.omnidl.openDirectory();
    if (p) {
      setOutDir(p);
      await window.omnidl.settingsSet("downloadDir", p);
    }
  };

  const allSelected = useMemo(() => {
    if (!data?.entries.length) return false;
    return data.entries.every((e) => selected.has(e.id));
  }, [data, selected]);

  const toggleSelectAll = () => {
    if (!data) return;
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(data.entries.map((e) => e.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const enqueueBatch = async () => {
    if (!data?.entries.length || !outDir) return;
    const { label, formatSelector, kind } = selectorFor(mode);
    const items = data.entries.filter((e) => selected.has(e.id));
    for (const e of items) {
      await window.omnidl.queueAddToQueue({
        url: e.url,
        title: e.title,
        formatLabel: label,
        formatSelector,
        outputDir: outDir,
        kind,
        platform: "youtube",
        thumbnailUrl: e.thumbnail ?? undefined,
      });
    }
  };

  return (
    <div className="space-y-5">
      <BrutalPanel className="p-5">
        <div className="flex items-center gap-2 text-sm font-black uppercase">
          <ListVideo className="h-5 w-5" strokeWidth={2} aria-hidden />
          Playlist URL
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="min-w-[240px] flex-1 border-4 border-[#111] bg-white px-3 py-2 font-semibold"
            placeholder="YouTube playlist URL"
          />
          <input
            type="number"
            min={1}
            max={100}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="w-24 border-4 border-[#111] bg-white px-2 py-2 font-bold"
          />
          <motion.button
            type="button"
            disabled={loading || !url.trim()}
            onClick={() => void load()}
            whileHover={loading || !url.trim() ? undefined : { y: -2 }}
            whileTap={loading || !url.trim() ? undefined : { scale: 0.98 }}
            className={`inline-flex items-center gap-2 border-4 border-[#111] bg-[#ffe66d] px-4 py-2 font-black uppercase shadow-[4px_4px_0_0_#111] disabled:opacity-50 ${btnHover}`}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
            {loading ? "…" : "Get playlist"}
          </motion.button>
        </div>
        {err && <p className="mt-2 text-sm font-bold text-red-700">{err}</p>}
      </BrutalPanel>

      <AnimatePresence mode="wait">
        {data ? (
          <motion.div
            key={data.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <BrutalPanel className="p-5">
              <div className="text-lg font-black">{data.title}</div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="text-xs font-black uppercase">Quality</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as PlMode)}
                  className="border-4 border-[#111] bg-white px-2 py-1 font-bold"
                >
                  <option value="480">480p</option>
                  <option value="bestv">Best video</option>
                  <option value="besta">Best audio</option>
                </select>
                <motion.button
                  type="button"
                  onClick={toggleSelectAll}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`border-4 border-[#111] bg-white px-3 py-1 text-xs font-black uppercase shadow-[4px_4px_0_0_#111] ${btnHover}`}
                >
                  {allSelected ? "Deselect all" : "Select all"}
                </motion.button>
                <span className="text-xs font-bold text-neutral-600">
                  {selected.size} / {data.entries.length} selected
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <div className="min-w-0 flex-1 truncate border-4 border-[#111] bg-white px-2 py-2 text-xs font-semibold">
                  {outDir}
                </div>
                <motion.button
                  type="button"
                  onClick={() => void pickDir()}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`inline-flex items-center gap-2 border-4 border-[#111] bg-[#fab1a0] px-3 py-2 text-xs font-black uppercase shadow-[4px_4px_0_0_#111] ${btnHover}`}
                >
                  <FolderOpen className="h-4 w-4" strokeWidth={2} aria-hidden />
                  Folder
                </motion.button>
                <motion.button
                  type="button"
                  disabled={!outDir || selected.size === 0}
                  onClick={() => void enqueueBatch()}
                  whileHover={outDir && selected.size > 0 ? { y: -2 } : undefined}
                  whileTap={outDir && selected.size > 0 ? { scale: 0.98 } : undefined}
                  className={`inline-flex items-center gap-2 border-4 border-[#111] bg-[#ff6b6b] px-4 py-2 font-black uppercase text-white shadow-[4px_4px_0_0_#111] disabled:opacity-50 ${btnHover}`}
                >
                  <Plus className="h-5 w-5" strokeWidth={2} aria-hidden />
                  Enqueue selected
                </motion.button>
              </div>
              <div className="mt-4 max-h-[70vh] overflow-auto pr-1">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {data.entries.map((e, i) => (
                    <motion.div
                      key={e.id + e.index}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.015, 0.35), duration: 0.2 }}
                      className={`flex flex-col border-4 border-[#111] bg-white ${
                        selected.has(e.id) ? "ring-2 ring-[#111] ring-offset-2" : ""
                      }`}
                    >
                      <label className="relative flex cursor-pointer flex-col">
                        <span className="absolute left-2 top-2 z-10">
                          <input
                            type="checkbox"
                            checked={selected.has(e.id)}
                            onChange={() => toggleOne(e.id)}
                            className="h-4 w-4 border-4 border-[#111]"
                          />
                        </span>
                        <div className="aspect-video w-full overflow-hidden border-b-4 border-[#111] bg-neutral-200">
                          {e.thumbnail ? (
                            <img src={e.thumbnail} alt="" className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="p-2">
                          <div className="text-[10px] font-black text-neutral-500">#{e.index}</div>
                          <div className="mt-1 line-clamp-3 text-xs font-bold leading-snug">{e.title}</div>
                        </div>
                      </label>
                    </motion.div>
                  ))}
                </div>
              </div>
            </BrutalPanel>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
