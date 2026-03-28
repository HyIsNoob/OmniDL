import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, FolderOpen, Layers, Link2, Loader2, Music, Video } from "lucide-react";
import type { FormatOption, QueueJob, VideoInfoPayload } from "@shared/ipc";
import { formatBytes, formatDuration } from "../lib/format";
import { useSettingsStore } from "../store/settingsUi";
import { BrutalPanel } from "../components/BrutalPanel";

const infoContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
};

const infoBlock = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
};

const btnMotion =
  "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";

export function Home({ url, setUrl }: { url: string; setUrl: (s: string) => void }) {
  const autoFetch = useSettingsStore((s) => s.autoFetch);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<VideoInfoPayload | null>(null);
  const [sel, setSel] = useState<FormatOption | null>(null);
  const [kind, setKind] = useState<"video" | "audio">("video");
  const [outDir, setOutDir] = useState<string>("");
  const [trackedJob, setTrackedJob] = useState<QueueJob | null>(null);
  const [audioSel, setAudioSel] = useState<string>("best-audio");
  const [quickHint, setQuickHint] = useState<string | null>(null);

  const flashHint = useCallback((msg: string) => {
    setQuickHint(msg);
    window.setTimeout(() => setQuickHint(null), 1400);
  }, []);

  const copyText = useCallback(
    async (text: string, okMsg: string) => {
      try {
        await navigator.clipboard.writeText(text);
        flashHint(okMsg);
      } catch {
        flashHint("Copy failed");
      }
    },
    [flashHint],
  );

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

  useEffect(() => {
    const off = window.omnidl.onQueueUpdate((s) => {
      setTrackedJob((prev) => {
        if (!prev?.id) return prev;
        const j = s.jobs.find((x) => x.id === prev.id);
        if (!j) return null;
        const next = { ...j };
        const finished =
          j.status === "completed" || j.status === "error" || j.status === "cancelled";
        const wasActive =
          prev.status === "pending" || prev.status === "downloading" || prev.status === "paused";
        if (finished && wasActive) {
          window.setTimeout(() => setTrackedJob(null), 1200);
        }
        return next;
      });
    });
    return off;
  }, []);

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
      setAudioSel("best-audio");
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
      return (
        info.options.find((o) => o.id === audioSel) ??
        info.options.find((o) => o.id === "best-audio") ??
        null
      );
    }
    return sel;
  }, [info, kind, sel, audioSel]);

  const audioOptions = useMemo(() => {
    if (!info) return [];
    return info.options.filter(
      (o) => o.id === "best-audio" || o.id === "audio-128" || o.id === "audio-320",
    );
  }, [info]);

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
      thumbnailUrl:
        kind === "video" && info.meta.thumbnail ? info.meta.thumbnail : undefined,
    };
    const job =
      mode === "next"
        ? await window.omnidl.queueAddDownload(payload)
        : await window.omnidl.queueAddToQueue(payload);
    setTrackedJob({ ...job });
  };

  return (
    <div className="flex flex-col gap-5">
      <motion.div layout initial={false} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
        <BrutalPanel className="p-5">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide">
            <Link2 className="h-5 w-5" strokeWidth={2} aria-hidden />
            URL
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <motion.input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void fetchNow();
              }}
              whileFocus={{ scale: 1.005 }}
              transition={{ duration: 0.15 }}
              className="min-w-[240px] flex-1 border-4 border-[#111] bg-white px-3 py-2.5 font-semibold outline-none ring-0 focus:border-[#111] focus:shadow-[4px_4px_0_0_#111]"
              placeholder="YouTube or TikTok video URL"
            />
            <motion.button
              type="button"
              onClick={() => void fetchNow()}
              disabled={loading || !url.trim()}
              whileHover={loading || !url.trim() ? undefined : { y: -2 }}
              whileTap={loading || !url.trim() ? undefined : { scale: 0.98 }}
              className={`inline-flex items-center gap-2 border-4 border-[#111] bg-[#ffe66d] px-4 py-2.5 font-black uppercase shadow-[4px_4px_0_0_#111] disabled:opacity-50 ${btnMotion}`}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
              {loading ? "Fetching" : "Fetch"}
            </motion.button>
          </div>
          {err && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 text-sm font-bold text-red-700"
            >
              {err}
            </motion.p>
          )}
        </BrutalPanel>
      </motion.div>

      <AnimatePresence mode="wait">
        {info ? (
          <motion.div
            key={info.meta.webpageUrl}
            variants={infoContainer}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
            layout
            className="grid gap-5 lg:grid-cols-[1.1fr_1fr] lg:items-start"
          >
            <motion.div variants={infoBlock} className="contents">
              <BrutalPanel className="p-5 lg:self-start">
                <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
                  {info.meta.thumbnail ? (
                    <motion.img
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      src={info.meta.thumbnail}
                      alt=""
                      className="h-36 w-64 shrink-0 border-4 border-[#111] object-cover"
                    />
                  ) : (
                    <motion.div
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-36 w-64 shrink-0 border-4 border-[#111] bg-neutral-200"
                      style={{
                        backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 6px, rgba(0,0,0,0.07) 6px, rgba(0,0,0,0.07) 12px)`,
                      }}
                      aria-hidden
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <motion.h2
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.08, duration: 0.28 }}
                      className="text-left text-lg font-black leading-tight"
                    >
                      {info.meta.title}
                    </motion.h2>
                    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs font-bold text-neutral-700">
                      <dt className="text-neutral-500">Channel</dt>
                      <dd className="min-w-0 truncate text-left">{info.meta.uploader ?? "—"}</dd>
                      <dt className="text-neutral-500">Duration</dt>
                      <dd className="text-left">{formatDuration(info.meta.duration)}</dd>
                      <dt className="text-neutral-500">Views</dt>
                      <dd className="text-left">
                        {info.meta.viewCount != null ? info.meta.viewCount.toLocaleString() : "—"}
                      </dd>
                      <dt className="text-neutral-500">Date</dt>
                      <dd className="text-left">{info.meta.uploadDate ?? "—"}</dd>
                      <dt className="text-neutral-500">Platform</dt>
                      <dd className="text-left uppercase">{info.meta.platform}</dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -5, rotate: -0.8, transition: { duration: 0.18 } }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => void copyText(info.meta.webpageUrl, "Link copied")}
                    className="border-4 border-[#111] bg-[#4ecdc4] px-3 py-3 text-left shadow-[4px_4px_0_0_#111] outline-none ring-0 transition-shadow hover:shadow-[7px_7px_0_0_#111] focus-visible:ring-4 focus-visible:ring-[#111]"
                  >
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#111]/80">
                      Clipboard
                    </div>
                    <div className="mt-1 font-black leading-tight text-[#111]">Copy page URL</div>
                  </motion.button>
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.16, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -5, rotate: 0.8, transition: { duration: 0.18 } }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => void copyText(info.meta.title, "Title copied")}
                    className="border-4 border-[#111] bg-[#ffe66d] px-3 py-3 text-left shadow-[4px_4px_0_0_#111] outline-none ring-0 transition-shadow hover:shadow-[7px_7px_0_0_#111] focus-visible:ring-4 focus-visible:ring-[#111]"
                  >
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#111]/80">
                      Clipboard
                    </div>
                    <div className="mt-1 line-clamp-2 font-black leading-tight text-[#111]">Copy title</div>
                  </motion.button>
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.22, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -5, x: -2, transition: { duration: 0.18 } }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      window.open(info.meta.webpageUrl, "_blank", "noopener,noreferrer");
                    }}
                    className="border-4 border-[#111] bg-[#fab1a0] px-3 py-3 text-left shadow-[4px_4px_0_0_#111] outline-none ring-0 transition-shadow hover:shadow-[7px_7px_0_0_#111] focus-visible:ring-4 focus-visible:ring-[#111]"
                  >
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#111]/80">
                      Browser
                    </div>
                    <div className="mt-1 font-black leading-tight text-[#111]">Open source page</div>
                  </motion.button>
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.28, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -5, scale: 1.02, transition: { duration: 0.18 } }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      const lines = [
                        info.meta.title,
                        info.meta.uploader ? `Channel: ${info.meta.uploader}` : "",
                        `URL: ${info.meta.webpageUrl}`,
                        `Duration: ${formatDuration(info.meta.duration)}`,
                        info.meta.viewCount != null ? `Views: ${info.meta.viewCount.toLocaleString()}` : "",
                      ].filter(Boolean);
                      void copyText(lines.join("\n"), "Summary copied");
                    }}
                    className="border-4 border-[#111] bg-[#a29bfe] px-3 py-3 text-left shadow-[4px_4px_0_0_#111] outline-none ring-0 transition-shadow hover:shadow-[7px_7px_0_0_#111] focus-visible:ring-4 focus-visible:ring-[#111]"
                  >
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#111]/80">
                      Export
                    </div>
                    <div className="mt-1 font-black leading-tight text-[#111]">Copy text summary</div>
                  </motion.button>
                </div>
                <AnimatePresence>
                  {quickHint ? (
                    <motion.p
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="mt-3 text-center text-[11px] font-black uppercase tracking-wider text-[#111]"
                    >
                      {quickHint}
                    </motion.p>
                  ) : null}
                </AnimatePresence>
                {trackedJob &&
                  (trackedJob.status === "downloading" ||
                    trackedJob.status === "pending" ||
                    trackedJob.status === "paused") && (
                    <div className="mt-4 border-4 border-[#111] bg-[#fffef8] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black uppercase">
                        <span>
                          {trackedJob.status === "pending"
                            ? "Queued"
                            : trackedJob.status === "paused"
                              ? "Paused"
                              : "Downloading"}
                        </span>
                        {trackedJob.status === "downloading" ? (
                          <span className="font-mono text-[10px] font-bold text-neutral-600">
                            {trackedJob.speed ?? ""}
                            {trackedJob.eta ? ` · ETA ${trackedJob.eta}` : ""}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 h-5 w-full overflow-hidden border-4 border-[#111] bg-neutral-200">
                        <motion.div
                          className="h-full bg-[#4ecdc4]"
                          initial={false}
                          animate={{ width: `${Math.min(100, Math.max(0, trackedJob.progress))}%` }}
                          transition={{ type: "spring", stiffness: 140, damping: 24 }}
                        />
                      </div>
                      <div className="mt-1 text-right font-mono text-[10px] font-bold text-neutral-600">
                        {Math.round(trackedJob.progress)}%
                      </div>
                    </div>
                  )}
              </BrutalPanel>
            </motion.div>

            <motion.div variants={infoBlock} className="contents">
              <BrutalPanel className="min-w-0 p-5">
            <div className="flex gap-2">
              <motion.button
                type="button"
                onClick={() => setKind("video")}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                className={`flex flex-1 items-center justify-center gap-2 border-4 border-[#111] px-3 py-2.5 font-black uppercase transition-colors ${
                  kind === "video" ? "bg-[#4ecdc4]" : "bg-white hover:bg-neutral-100"
                }`}
              >
                <Video className="h-5 w-5" strokeWidth={2} aria-hidden />
                Video
              </motion.button>
              <motion.button
                type="button"
                onClick={() => setKind("audio")}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                className={`flex flex-1 items-center justify-center gap-2 border-4 border-[#111] px-3 py-2.5 font-black uppercase transition-colors ${
                  kind === "audio" ? "bg-[#a29bfe]" : "bg-white hover:bg-neutral-100"
                }`}
              >
                <Music className="h-5 w-5" strokeWidth={2} aria-hidden />
                Audio
              </motion.button>
            </div>

            {kind === "video" && (
              <ul className="mt-3 max-h-64 space-y-2 overflow-auto pr-1">
                {info.options
                  .filter(
                    (o) => o.id !== "best-audio" && o.id !== "audio-128" && o.id !== "audio-320",
                  )
                  .map((o) => (
                    <li key={o.id}>
                      <motion.label
                        whileHover={{ x: 2 }}
                        transition={{ duration: 0.15 }}
                        className="flex cursor-pointer items-center justify-between gap-2 border-4 border-[#111] bg-white px-3 py-2 text-sm font-bold"
                      >
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
                      </motion.label>
                    </li>
                  ))}
              </ul>
            )}

            {kind === "audio" && (
              <ul className="mt-3 max-h-64 space-y-2 overflow-auto pr-1">
                {audioOptions.map((o) => (
                  <li key={o.id}>
                    <motion.label
                      whileHover={{ x: 2 }}
                      transition={{ duration: 0.15 }}
                      className="flex cursor-pointer items-center justify-between gap-2 border-4 border-[#111] bg-white px-3 py-2 text-sm font-bold"
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="fmt-audio"
                          checked={audioSel === o.id}
                          onChange={() => setAudioSel(o.id)}
                        />
                        {o.label}
                      </span>
                      <span className="text-xs text-neutral-600">
                        {formatBytes(o.estimatedBytes)}
                        {o.isEstimate ? " (est.)" : ""}
                      </span>
                    </motion.label>
                  </li>
                ))}
              </ul>
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
                <motion.button
                  type="button"
                  onClick={() => void pickDir()}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`inline-flex items-center gap-2 border-4 border-[#111] bg-[#fab1a0] px-3 py-2 text-xs font-black uppercase shadow-[4px_4px_0_0_#111] ${btnMotion}`}
                >
                  <FolderOpen className="h-4 w-4" strokeWidth={2} aria-hidden />
                  Browse
                </motion.button>
              </div>
            </div>

            <div className="mt-4 flex w-full min-w-0 gap-2">
              <motion.button
                type="button"
                disabled={!selectedOption || !outDir}
                onClick={() => void enqueue("next")}
                whileHover={selectedOption && outDir ? { y: -2 } : undefined}
                whileTap={selectedOption && outDir ? { scale: 0.98 } : undefined}
                className={`flex min-w-0 flex-1 items-center justify-center gap-2 border-4 border-[#111] bg-[#ff6b6b] px-3 py-2.5 font-black uppercase text-white shadow-[4px_4px_0_0_#111] disabled:opacity-50 ${btnMotion}`}
              >
                <Download className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
                Download
              </motion.button>
              <motion.button
                type="button"
                disabled={!selectedOption || !outDir}
                onClick={() => void enqueue("end")}
                whileHover={selectedOption && outDir ? { y: -2 } : undefined}
                whileTap={selectedOption && outDir ? { scale: 0.98 } : undefined}
                className={`flex min-w-0 flex-1 items-center justify-center gap-2 border-4 border-[#111] bg-white px-3 py-2.5 font-black uppercase shadow-[4px_4px_0_0_#111] disabled:opacity-50 ${btnMotion}`}
              >
                <Layers className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
                Add to queue
              </motion.button>
            </div>
          </BrutalPanel>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
