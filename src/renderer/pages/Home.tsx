import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, FolderOpen, Layers, Link2, Loader2, Music, Video } from "lucide-react";
import type { FormatOption, QueueJob } from "@shared/ipc";
import { formatBytes, formatDuration } from "../lib/format";
import { useSettingsStore } from "../store/settingsUi";
import { useHomeFetchUiStore } from "../store/homeFetchUi";
import { useSessionFetchStore } from "../store/sessionFetch";
import { BrutalPanel } from "../components/BrutalPanel";
import { HomeFetchWidget } from "../components/HomeFetchWidget";

const btnMotion =
  "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";

export function Home({ url, setUrl }: { url: string; setUrl: (s: string) => void }) {
  const autoFetch = useSettingsStore((s) => s.autoFetch);
  const animationFull = useSettingsStore((s) => s.animationLevel === "full");
  const setFetching = useHomeFetchUiStore((s) => s.setFetching);
  const setFetchSuccess = useHomeFetchUiStore((s) => s.setFetchSuccess);
  const setFetchError = useHomeFetchUiStore((s) => s.setFetchError);
  const releaseFetchUi = useHomeFetchUiStore((s) => s.release);
  const fetchInFlight = useHomeFetchUiStore((s) => s.inFlight);

  const infoContainer = useMemo(
    () => ({
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: {
          staggerChildren: animationFull ? 0.07 : 0.02,
          delayChildren: animationFull ? 0.04 : 0,
        },
      },
    }),
    [animationFull],
  );

  const infoBlock = useMemo(
    () => ({
      hidden: { opacity: 0, y: animationFull ? 14 : 6 },
      show: {
        opacity: 1,
        y: 0,
        transition: { duration: animationFull ? 0.28 : 0.12, ease: [0.22, 1, 0.36, 1] },
      },
    }),
    [animationFull],
  );

  const formatPanelRoot = useMemo(
    () => ({
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: {
          staggerChildren: animationFull ? 0.065 : 0.038,
          delayChildren: animationFull ? 0.05 : 0.03,
        },
      },
    }),
    [animationFull],
  );

  const formatPanelSection = useMemo(
    () => ({
      hidden: { opacity: 0, y: animationFull ? 12 : 6 },
      show: {
        opacity: 1,
        y: 0,
        transition: { duration: animationFull ? 0.26 : 0.13, ease: [0.22, 1, 0.36, 1] },
      },
    }),
    [animationFull],
  );

  const formatListRoot = useMemo(
    () => ({
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: {
          staggerChildren: animationFull ? 0.038 : 0.022,
          delayChildren: animationFull ? 0.015 : 0.008,
        },
      },
    }),
    [animationFull],
  );

  const formatListItem = useMemo(
    () => ({
      hidden: { opacity: 0, y: animationFull ? 8 : 4 },
      show: {
        opacity: 1,
        y: 0,
        transition: { duration: animationFull ? 0.2 : 0.11, ease: [0.22, 1, 0.36, 1] },
      },
    }),
    [animationFull],
  );

  const [err, setErr] = useState<string | null>(null);
  const info = useSessionFetchStore((s) => s.homeVideo);
  const homeSelId = useSessionFetchStore((s) => s.homeSelId);
  const kind = useSessionFetchStore((s) => s.homeKind);
  const audioSel = useSessionFetchStore((s) => s.homeAudioSel);
  const setHomeSession = useSessionFetchStore((s) => s.setHomeSession);
  const setHomeSelId = useSessionFetchStore((s) => s.setHomeSelId);
  const setHomeKind = useSessionFetchStore((s) => s.setHomeKind);
  const setHomeAudioSel = useSessionFetchStore((s) => s.setHomeAudioSel);
  const clearHomeSession = useSessionFetchStore((s) => s.clearHomeSession);
  const [outDir, setOutDir] = useState<string>("");
  const [trackedJob, setTrackedJob] = useState<QueueJob | null>(null);
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
    let cancel = false;
    void (async () => {
      const t = url.trim();
      if (!t) {
        clearHomeSession();
        return;
      }
      const normalized = await window.omnidl.normalizeUrl(t);
      const u = normalized || t;
      if (cancel) return;
      const st = useSessionFetchStore.getState();
      if (st.homeFetchedUrl && u !== st.homeFetchedUrl) {
        clearHomeSession();
      }
    })();
    return () => {
      cancel = true;
    };
  }, [url, clearHomeSession]);

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
    return () => {
      off();
    };
  }, []);

  const fetchNow = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false;
      setErr(null);
      const normalized = await window.omnidl.normalizeUrl(url.trim());
      const u = normalized || url.trim();
      if (silent) {
        const st = useSessionFetchStore.getState();
        if (st.homeFetchedUrl === u && st.homeVideo) return;
      }
      if (!silent) {
        clearHomeSession();
      }
      setFetching();
      try {
        const data = await window.omnidl.fetchVideo(u);
        const first =
          data.options.find((o) => o.id === "best-video") ?? data.options[0] ?? null;
        setHomeSession({
          homeVideo: data,
          homeFetchedUrl: u,
          homeSelId: first?.id ?? null,
          homeKind: "video",
          homeAudioSel: "best-audio",
        });
        if (!silent) setFetchSuccess();
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
        if (!silent) setFetchError();
      } finally {
        if (silent) releaseFetchUi();
      }
    },
    [
      url,
      setFetching,
      setFetchSuccess,
      setFetchError,
      releaseFetchUi,
      clearHomeSession,
      setHomeSession,
    ],
  );

  useEffect(() => {
    if (!autoFetch) return;
    const t = window.setTimeout(() => {
      if (!url.trim() || !url.includes("http")) return;
      if (
        !url.includes("youtube") &&
        !url.includes("youtu.be") &&
        !url.includes("tiktok") &&
        !url.includes("facebook") &&
        !url.includes("fb.watch") &&
        !url.includes("fb.com")
      ) {
        return;
      }
      void fetchNow({ silent: true });
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

  const sel = useMemo((): FormatOption | null => {
    if (!info) return null;
    if (!homeSelId) {
      return info.options.find((o) => o.id === "best-video") ?? info.options[0] ?? null;
    }
    return info.options.find((o) => o.id === homeSelId) ?? null;
  }, [info, homeSelId]);

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

  const saveThumbnail = useCallback(async () => {
    if (!info?.meta.thumbnail) return;
    const base = (info.meta.title || "cover").slice(0, 120);
    const r = await window.omnidl.thumbnailSaveAs({
      url: info.meta.thumbnail,
      defaultName: `${base}.jpg`,
    });
    if (r.ok) flashHint("Cover saved");
    else flashHint(r.path ? "Save failed" : "Cancelled");
  }, [info, flashHint]);

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
    <div className="relative flex flex-col gap-5">
      <HomeFetchWidget />
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
              placeholder="YouTube, TikTok, or Facebook video / reel URL"
            />
            <motion.button
              type="button"
              onClick={() => void fetchNow()}
              disabled={fetchInFlight || !url.trim()}
              whileHover={fetchInFlight || !url.trim() ? undefined : { y: -2 }}
              whileTap={fetchInFlight || !url.trim() ? undefined : { scale: 0.98 }}
              className={`inline-flex items-center gap-2 border-4 border-[#111] bg-[#ffe66d] px-4 py-2.5 font-black uppercase shadow-[4px_4px_0_0_#111] disabled:opacity-50 ${btnMotion}`}
            >
              {fetchInFlight ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
              {fetchInFlight ? "Fetching" : "Fetch"}
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
                    <div className="flex shrink-0 flex-col gap-2">
                      <motion.img
                        layout
                        initial={{ opacity: 0, y: animationFull ? 12 : 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: animationFull ? 0.26 : 0.14, ease: [0.22, 1, 0.36, 1] }}
                        src={info.meta.thumbnail}
                        alt=""
                        className="h-36 w-64 border-4 border-[#111] object-cover"
                      />
                      <motion.button
                        type="button"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18, delay: animationFull ? 0.08 : 0 }}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => void saveThumbnail()}
                        className={`w-64 border-4 border-[#111] bg-[#a29bfe] px-2 py-2 text-center text-[11px] font-black uppercase tracking-wide shadow-[4px_4px_0_0_#111] ${btnMotion}`}
                      >
                        Download cover image
                      </motion.button>
                    </div>
                  ) : (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="h-36 w-64 shrink-0 border-4 border-[#111] bg-neutral-200"
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
                <motion.div
                  key={`${info.meta.webpageUrl}-${kind}`}
                  variants={formatPanelRoot}
                  initial="hidden"
                  animate="show"
                  className="flex flex-col"
                >
                  <motion.div variants={formatPanelSection} className="flex gap-2">
                    <motion.button
                      type="button"
                      onClick={() => setHomeKind("video")}
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
                      onClick={() => setHomeKind("audio")}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.99 }}
                      className={`flex flex-1 items-center justify-center gap-2 border-4 border-[#111] px-3 py-2.5 font-black uppercase transition-colors ${
                        kind === "audio" ? "bg-[#a29bfe]" : "bg-white hover:bg-neutral-100"
                      }`}
                    >
                      <Music className="h-5 w-5" strokeWidth={2} aria-hidden />
                      Audio
                    </motion.button>
                  </motion.div>

                  {kind === "video" ? (
                    <motion.div variants={formatPanelSection} className="min-h-0">
                      <motion.ul
                        variants={formatListRoot}
                        className="mt-3 max-h-64 list-none space-y-2 overflow-auto pr-1"
                      >
                        {info.options
                          .filter(
                            (o) =>
                              o.id !== "best-audio" &&
                              o.id !== "audio-128" &&
                              o.id !== "audio-320",
                          )
                          .map((o) => (
                            <motion.li key={o.id} variants={formatListItem}>
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
                                    onChange={() => setHomeSelId(o.id)}
                                  />
                                  {o.label}
                                </span>
                                <span className="text-xs text-neutral-600">
                                  {formatBytes(o.estimatedBytes)}
                                  {o.isEstimate ? " (est.)" : ""}
                                </span>
                              </motion.label>
                            </motion.li>
                          ))}
                      </motion.ul>
                    </motion.div>
                  ) : null}

                  {kind === "audio" ? (
                    <motion.div variants={formatPanelSection} className="min-h-0">
                      <motion.ul
                        variants={formatListRoot}
                        className="mt-3 max-h-64 list-none space-y-2 overflow-auto pr-1"
                      >
                        {audioOptions.map((o) => (
                          <motion.li key={o.id} variants={formatListItem}>
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
                                  onChange={() => setHomeAudioSel(o.id)}
                                />
                                {o.label}
                              </span>
                              <span className="text-xs text-neutral-600">
                                {formatBytes(o.estimatedBytes)}
                                {o.isEstimate ? " (est.)" : ""}
                              </span>
                            </motion.label>
                          </motion.li>
                        ))}
                      </motion.ul>
                    </motion.div>
                  ) : null}

                  <motion.div variants={formatPanelSection} className="mt-4">
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
                  </motion.div>

                  <motion.div variants={formatPanelSection} className="mt-4 flex w-full min-w-0 gap-2">
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
                  </motion.div>
                </motion.div>
              </BrutalPanel>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
