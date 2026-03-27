import { useEffect, useState } from "react";
import { FolderOpen, ListVideo, Loader2, Plus } from "lucide-react";
import type { PlaylistInfoPayload } from "@shared/ipc";
import { BrutalPanel } from "../components/BrutalPanel";

type PlMode = "480" | "bestv" | "besta";

function selectorFor(mode: PlMode): { label: string; formatSelector: string; kind: "video" | "audio" } {
  if (mode === "480")
    return {
      label: "480p",
      formatSelector: "bestvideo[height<=480]+bestaudio/best[height<=480]",
      kind: "video",
    };
  if (mode === "bestv")
    return { label: "Best video", formatSelector: "bv*+ba/b", kind: "video" };
  return { label: "Best audio", formatSelector: "ba/b", kind: "audio" };
}

export function Playlist() {
  const [url, setUrl] = useState("");
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<PlaylistInfoPayload | null>(null);
  const [mode, setMode] = useState<PlMode>("bestv");
  const [count, setCount] = useState<number | "all">("all");
  const [outDir, setOutDir] = useState("");

  useEffect(() => {
    void (async () => {
      const d = await window.omnidl.settingsGet("downloadDir");
      if (d) setOutDir(d);
      else setOutDir(await window.omnidl.pathsDownloads());
      const l = await window.omnidl.settingsGet("playlistLimit");
      if (l) setLimit(Number(l) || 50);
    })();
  }, []);

  const load = async () => {
    setErr(null);
    setLoading(true);
    setData(null);
    try {
      const lim = Math.min(100, Math.max(1, limit));
      await window.omnidl.settingsSet("playlistLimit", String(lim));
      const pl = await window.omnidl.fetchPlaylist(url.trim(), lim);
      setData(pl);
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

  const enqueueBatch = async () => {
    if (!data?.entries.length || !outDir) return;
    const { label, formatSelector, kind } = selectorFor(mode);
    const items =
      count === "all" ? data.entries : data.entries.slice(0, Math.max(1, Number(count)));
    for (const e of items) {
      await window.omnidl.queueAddToQueue({
        url: e.url,
        title: e.title,
        formatLabel: label,
        formatSelector,
        outputDir: outDir,
        kind,
        platform: "youtube",
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
          <button
            type="button"
            disabled={loading || !url.trim()}
            onClick={() => void load()}
            className="inline-flex items-center gap-2 border-4 border-[#111] bg-[#ffe66d] px-4 py-2 font-black uppercase shadow-[4px_4px_0_0_#111] disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
            {loading ? "…" : "Get playlist"}
          </button>
        </div>
        {err && <p className="mt-2 text-sm font-bold text-red-700">{err}</p>}
      </BrutalPanel>

      {data && (
        <BrutalPanel className="p-5">
          <div className="text-lg font-black">{data.title}</div>
          <div className="mt-3 flex flex-wrap gap-2">
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
            <label className="text-xs font-black uppercase">Count</label>
            <select
              value={count === "all" ? "all" : String(count)}
              onChange={(e) => {
                const v = e.target.value;
                setCount(v === "all" ? "all" : Number(v));
              }}
              className="border-4 border-[#111] bg-white px-2 py-1 font-bold"
            >
              <option value="all">All (within limit)</option>
              {data.entries.slice(0, 20).map((_, i) => (
                <option key={i} value={i + 1}>
                  First {i + 1}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="min-w-0 flex-1 truncate border-4 border-[#111] bg-white px-2 py-2 text-xs font-semibold">
              {outDir}
            </div>
            <button
              type="button"
              onClick={() => void pickDir()}
              className="inline-flex items-center gap-2 border-4 border-[#111] bg-[#fab1a0] px-3 py-2 text-xs font-black uppercase"
            >
              <FolderOpen className="h-4 w-4" strokeWidth={2} aria-hidden />
              Folder
            </button>
            <button
              type="button"
              disabled={!outDir}
              onClick={() => void enqueueBatch()}
              className="inline-flex items-center gap-2 border-4 border-[#111] bg-[#ff6b6b] px-4 py-2 font-black uppercase text-white disabled:opacity-50"
            >
              <Plus className="h-5 w-5" strokeWidth={2} aria-hidden />
              Enqueue all
            </button>
          </div>
          <ul className="mt-4 max-h-80 space-y-2 overflow-auto pr-1 text-sm font-bold">
            {data.entries.map((e) => (
              <li key={e.id + e.index} className="flex gap-2 border-4 border-[#111] bg-white px-2 py-1">
                <span className="w-8 text-neutral-500">{e.index}</span>
                <span className="min-w-0 flex-1 truncate">{e.title}</span>
              </li>
            ))}
          </ul>
        </BrutalPanel>
      )}
    </div>
  );
}
