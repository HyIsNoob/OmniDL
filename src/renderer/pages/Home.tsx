import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, FolderOpen, Layers, Link2, Loader2, Music, Video } from "lucide-react";
import type { FormatOption, VideoInfoPayload } from "@shared/ipc";
import { formatBytes, formatDuration } from "../lib/format";
import { useSettingsStore } from "../store/settingsUi";
import { BrutalPanel } from "../components/BrutalPanel";

export function Home({ url, setUrl }: { url: string; setUrl: (s: string) => void }) {
  const autoFetch = useSettingsStore((s) => s.autoFetch);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<VideoInfoPayload | null>(null);
  const [sel, setSel] = useState<FormatOption | null>(null);
  const [kind, setKind] = useState<"video" | "audio">("video");
  const [outDir, setOutDir] = useState<string>("");

  const loadDir = useCallback(async () => {
    const d = await window.omnidl.settingsGet("downloadDir");
    if (d) {
      setOutDir(d);
      return;
    }
    const def = await window.omnidl.pathsDownloads();
    setOutDir(def);
  }, []);

  useEffect(() => {
    void loadDir();
  }, [loadDir]);

  const fetchNow = useCallback(async () => {
    setErr(null);
    setLoading(true);
    setInfo(null);
    setSel(null);
    try {
      const normalized = await window.omnidl.normalizeUrl(url.trim());
      const u = normalized || url.trim();
      const data = await window.omnidl.fetchVideo(u);
      setInfo(data);
      const first =
        data.options.find((o) => o.id === "best-video") ?? data.options[0] ?? null;
      setSel(first);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (!autoFetch) return;
    const t = window.setTimeout(() => {
      if (!url.trim() || !url.includes("http")) return;
      if (!url.includes("youtube") && !url.includes("youtu.be") && !url.includes("tiktok")) return;
      void fetchNow();
    }, 700);
    return () => window.clearTimeout(t);
  }, [url, fetchNow, autoFetch]);

  const pickDir = async () => {
    const p = await window.omnidl.openDirectory();
    if (p) {
      setOutDir(p);
      await window.omnidl.settingsSet("downloadDir", p);
    }
  };

  const selectedOption = useMemo(() => {
    if (!info) return null;
    if (kind === "audio") {
      return info.options.find((o) => o.id === "best-audio") ?? null;
    }
    return sel;
  }, [info, kind, sel]);

  const enqueue = async (mode: "next" | "end") => {
    if (!info || !selectedOption || !outDir) return;
    const payload = {
      url: info.meta.webpageUrl,
      title: info.meta.title,
      formatLabel: selectedOption.label,
      formatSelector: selectedOption.formatSelector,
      outputDir: outDir,
      kind,
      platform: info.meta.platform,
    };
    if (mode === "next") await window.omnidl.queueAddDownload(payload);
    else await window.omnidl.queueAddToQueue(payload);
  };

  return (
    <div className="flex flex-col gap-5">
      <BrutalPanel className="p-5">
        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide">
          <Link2 className="h-5 w-5" strokeWidth={2} aria-hidden />
          URL
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void fetchNow();
            }}
            className="min-w-[240px] flex-1 border-4 border-[#111] bg-white px-3 py-2.5 font-semibold outline-none ring-0 focus:border-[#111] focus:shadow-[4px_4px_0_0_#111]"
            placeholder="YouTube or TikTok video URL"
          />
          <button
            type="button"
            onClick={() => void fetchNow()}
            disabled={loading || !url.trim()}
            className="inline-flex items-center gap-2 border-4 border-[#111] bg-[#ffe66d] px-4 py-2.5 font-black uppercase shadow-[4px_4px_0_0_#111] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
            {loading ? "Fetching" : "Fetch"}
          </button>
        </div>
        {err && <p className="mt-3 text-sm font-bold text-red-700">{err}</p>}
      </BrutalPanel>

      {info && (
        <motion.div layout className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <BrutalPanel className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row">
              {info.meta.thumbnail && (
                <img
                  src={info.meta.thumbnail}
                  alt=""
                  className="h-36 w-64 border-4 border-[#111] object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-black leading-tight">{info.meta.title}</h2>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs font-bold text-neutral-700">
                  <dt>Channel</dt>
                  <dd className="truncate">{info.meta.uploader ?? "—"}</dd>
                  <dt>Duration</dt>
                  <dd>{formatDuration(info.meta.duration)}</dd>
                  <dt>Views</dt>
                  <dd>{info.meta.viewCount != null ? info.meta.viewCount.toLocaleString() : "—"}</dd>
                  <dt>Date</dt>
                  <dd>{info.meta.uploadDate ?? "—"}</dd>
                  <dt>Platform</dt>
                  <dd className="uppercase">{info.meta.platform}</dd>
                </dl>
              </div>
            </div>
          </BrutalPanel>

          <BrutalPanel className="p-5">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setKind("video")}
                className={`flex flex-1 items-center justify-center gap-2 border-4 border-[#111] px-3 py-2.5 font-black uppercase transition-colors ${
                  kind === "video" ? "bg-[#4ecdc4]" : "bg-white hover:bg-neutral-100"
                }`}
              >
                <Video className="h-5 w-5" strokeWidth={2} aria-hidden />
                Video
              </button>
              <button
                type="button"
                onClick={() => setKind("audio")}
                className={`flex flex-1 items-center justify-center gap-2 border-4 border-[#111] px-3 py-2.5 font-black uppercase transition-colors ${
                  kind === "audio" ? "bg-[#a29bfe]" : "bg-white hover:bg-neutral-100"
                }`}
              >
                <Music className="h-5 w-5" strokeWidth={2} aria-hidden />
                Audio
              </button>
            </div>

            {kind === "video" && (
              <ul className="mt-3 max-h-64 space-y-2 overflow-auto pr-1">
                {info.options
                  .filter((o) => o.id !== "best-audio")
                  .map((o) => (
                    <li key={o.id}>
                      <label className="flex cursor-pointer items-center justify-between gap-2 border-4 border-[#111] bg-white px-3 py-2 text-sm font-bold">
                        <span className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="fmt"
                            checked={sel?.id === o.id}
                            onChange={() => setSel(o)}
                          />
                          {o.label}
                        </span>
                        <span className="text-xs text-neutral-600">
                          {formatBytes(o.estimatedBytes)}
                          {o.isEstimate ? " (est.)" : ""}
                        </span>
                      </label>
                    </li>
                  ))}
              </ul>
            )}

            {kind === "audio" && (
              <div className="mt-3 border-4 border-[#111] bg-white px-3 py-2 text-sm font-bold">
                Best audio
                <div className="text-xs font-semibold text-neutral-600">
                  {formatBytes(info.options.find((x) => x.id === "best-audio")?.estimatedBytes ?? null)}
                </div>
              </div>
            )}

            <div className="mt-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase">
                <FolderOpen className="h-4 w-4" strokeWidth={2} aria-hidden />
                Download folder
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <div className="min-w-0 flex-1 truncate border-4 border-[#111] bg-white px-2 py-2 text-xs font-semibold">
                  {outDir || "—"}
                </div>
                <button
                  type="button"
                  onClick={() => void pickDir()}
                  className="inline-flex items-center gap-2 border-4 border-[#111] bg-[#fab1a0] px-3 py-2 text-xs font-black uppercase shadow-[4px_4px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  <FolderOpen className="h-4 w-4" strokeWidth={2} aria-hidden />
                  Browse
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!selectedOption || !outDir}
                onClick={() => void enqueue("next")}
                className="inline-flex items-center gap-2 border-4 border-[#111] bg-[#ff6b6b] px-4 py-2.5 font-black uppercase text-white shadow-[4px_4px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
              >
                <Download className="h-5 w-5" strokeWidth={2} aria-hidden />
                Download
              </button>
              <button
                type="button"
                disabled={!selectedOption || !outDir}
                onClick={() => void enqueue("end")}
                className="inline-flex items-center gap-2 border-4 border-[#111] bg-white px-4 py-2.5 font-black uppercase shadow-[4px_4px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
              >
                <Layers className="h-5 w-5" strokeWidth={2} aria-hidden />
                Add to queue
              </button>
            </div>
          </BrutalPanel>
        </motion.div>
      )}
    </div>
  );
}
