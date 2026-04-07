import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FolderOpen, ListVideo, Loader2, Plus } from "lucide-react";
import type { PlaylistEntry, PlaylistInfoPayload } from "@shared/ipc";
import { sanitizeFileNameSegment } from "@shared/filenameSanitize";
import { formatDuration } from "../lib/format";
import { useTabContentStagger } from "../lib/tabContentMotion";
import { BrutalPanel } from "../components/BrutalPanel";
import { usePlaylistUrlStore } from "../store/playlistUrl";
import { useFetchOverlayStore } from "../store/fetchOverlay";
import { useSettingsStore } from "../store/settingsUi";
import { useSessionFetchStore, type PlaylistMode } from "../store/sessionFetch";
import { useAppStore } from "../store/app";
import { ConfirmModal } from "../components/ConfirmModal";

const btnHover =
  "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";

function selectorFor(mode: PlaylistMode): { label: string; formatSelector: string; kind: "video" | "audio" } {
  if (mode === "480")
    return {
      label: "480p",
      formatSelector: "bv*[height<=480]+ba/b[height<=480]",
      kind: "video",
    };
  if (mode === "bestv")
    return { label: "Best video", formatSelector: "bv*+ba/b", kind: "video" };
  return { label: "Best audio", formatSelector: "bestaudio/best", kind: "audio" };
}

export function Playlist() {
  const url = usePlaylistUrlStore((s) => s.url);
  const setUrl = usePlaylistUrlStore((s) => s.setUrl);
  const playlistFullThumbnails = useSettingsStore((s) => s.playlistFullThumbnails);
  const animationFull = useSettingsStore((s) => s.animationLevel === "full");
  const stagger = useTabContentStagger();
  const setFetchOverlay = useFetchOverlayStore((s) => s.setFetchOverlay);

  const data = useSessionFetchStore((s) => s.playlistData);
  const playlistThumbRefinedIds = useSessionFetchStore((s) => s.playlistThumbRefinedIds);
  const playlistThumbRefineDone = useSessionFetchStore((s) => s.playlistThumbRefineDone);
  const mode = useSessionFetchStore((s) => s.playlistMode);
  const playlistSelectedIds = useSessionFetchStore((s) => s.playlistSelectedIds);

  const setPlaylistData = useSessionFetchStore((s) => s.setPlaylistData);
  const setPlaylistMeta = useSessionFetchStore((s) => s.setPlaylistMeta);
  const setPlaylistMode = useSessionFetchStore((s) => s.setPlaylistMode);
  const setPlaylistSelectedIds = useSessionFetchStore((s) => s.setPlaylistSelectedIds);
  const patchPlaylistEntryThumb = useSessionFetchStore((s) => s.patchPlaylistEntryThumb);
  const addPlaylistThumbRefined = useSessionFetchStore((s) => s.addPlaylistThumbRefined);
  const setPlaylistThumbRefineDone = useSessionFetchStore((s) => s.setPlaylistThumbRefineDone);
  const resetPlaylistThumbRefine = useSessionFetchStore((s) => s.resetPlaylistThumbRefine);
  const clearPlaylistSession = useSessionFetchStore((s) => s.clearPlaylistSession);

  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [outDir, setOutDir] = useState("");
  const [fetchKey, setFetchKey] = useState(0);
  const [refineSnapshot, setRefineSnapshot] = useState<PlaylistInfoPayload["entries"] | null>(null);
  const [quickHint, setQuickHint] = useState<string | null>(null);
  const [thumbBulkBusy, setThumbBulkBusy] = useState(false);
  const [confirmEnqueueOpen, setConfirmEnqueueOpen] = useState(false);
  const [enqueueSuccessOpen, setEnqueueSuccessOpen] = useState(false);
  const [lastEnqueueCount, setLastEnqueueCount] = useState(0);
  const setTab = useAppStore((s) => s.setTab);

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
    const st = useSessionFetchStore.getState();
    if (st.playlistData && st.playlistFetchedUrl === url.trim()) {
      setLimit(st.playlistFetchedLimit);
    }
  }, [url]);

  useEffect(() => {
    const t = url.trim();
    if (!t) {
      clearPlaylistSession();
      setRefineSnapshot(null);
      return;
    }
    const st = useSessionFetchStore.getState();
    if (st.playlistFetchedUrl && st.playlistData && t !== st.playlistFetchedUrl.trim()) {
      clearPlaylistSession();
      setRefineSnapshot(null);
    }
  }, [url, clearPlaylistSession]);

  useEffect(() => {
    if (!data?.entries.length || !playlistFullThumbnails) return;
    if (playlistThumbRefineDone) return;
    setRefineSnapshot((prev) => prev ?? data.entries);
  }, [data, playlistFullThumbnails, playlistThumbRefineDone]);

  useEffect(() => {
    if (!playlistFullThumbnails || !refineSnapshot?.length) return;
    let cancelled = false;
    void (async () => {
      const refined = new Set(useSessionFetchStore.getState().playlistThumbRefinedIds);
      for (const e of refineSnapshot) {
        if (cancelled) return;
        if (refined.has(e.id)) continue;
        const thumb = await window.omnidl.fetchVideoThumb(e.url);
        if (thumb && !cancelled) {
          patchPlaylistEntryThumb(e.id, thumb);
          addPlaylistThumbRefined(e.id);
          refined.add(e.id);
        }
        await new Promise((r) => setTimeout(r, 120));
      }
      if (!cancelled) {
        setPlaylistThumbRefineDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    refineSnapshot,
    playlistFullThumbnails,
    patchPlaylistEntryThumb,
    addPlaylistThumbRefined,
    setPlaylistThumbRefineDone,
  ]);

  const load = async () => {
    setErr(null);
    setLoading(true);
    clearPlaylistSession();
    setRefineSnapshot(null);
    setFetchOverlay(true, "Loading playlist…");
    try {
      const lim = Math.min(100, Math.max(1, limit));
      await window.omnidl.settingsSet("playlistLimit", String(lim));
      const pl = await window.omnidl.fetchPlaylist(url.trim(), lim);
      setPlaylistData(pl);
      setPlaylistMeta({ playlistFetchedUrl: url.trim(), playlistFetchedLimit: lim });
      setPlaylistSelectedIds(pl.entries.map((e) => e.id));
      if (playlistFullThumbnails) {
        resetPlaylistThumbRefine();
        setRefineSnapshot(pl.entries);
      } else {
        setPlaylistThumbRefineDone(true);
      }
      setFetchKey((k) => k + 1);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setFetchOverlay(false);
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
    return data.entries.every((e) => playlistSelectedIds.includes(e.id));
  }, [data, playlistSelectedIds]);

  const toggleSelectAll = () => {
    if (!data) return;
    if (allSelected) setPlaylistSelectedIds([]);
    else setPlaylistSelectedIds(data.entries.map((e) => e.id));
  };

  const toggleOne = (id: string) => {
    const next = new Set(playlistSelectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPlaylistSelectedIds([...next]);
  };

  const playlistDurationStats = useMemo(() => {
    if (!data?.entries.length) {
      return { totalSec: 0, knownCount: 0, unknownCount: 0 };
    }
    let totalSec = 0;
    let knownCount = 0;
    for (const e of data.entries) {
      if (e.duration != null && e.duration > 0) {
        totalSec += e.duration;
        knownCount++;
      }
    }
    return {
      totalSec,
      knownCount,
      unknownCount: data.entries.length - knownCount,
    };
  }, [data]);

  const thumbProgress =
    data && playlistFullThumbnails && !playlistThumbRefineDone
      ? Math.round((playlistThumbRefinedIds.length / Math.max(1, data.entries.length)) * 100)
      : 0;

  const saveEntryThumb = useCallback(async (e: PlaylistEntry) => {
    if (!e.thumbnail) return;
    const r = await window.omnidl.thumbnailSaveAs({
      url: e.thumbnail,
      defaultName: `${e.title.slice(0, 120)}.jpg`,
    });
    if (r.ok) flashHint("Cover saved");
    else flashHint(r.path ? "Save failed" : "Cancelled");
  }, [flashHint]);

  const downloadAllThumbs = useCallback(async () => {
    if (!data) return;
    const items = data.entries
      .filter((e) => e.thumbnail)
      .map((e, idx) => ({
        url: e.thumbnail as string,
        fileName: `${String(idx + 1).padStart(3, "0")}_${sanitizeFileNameSegment(e.title, 100)}.jpg`,
      }));
    if (!items.length) {
      flashHint("No thumbnails");
      return;
    }
    setThumbBulkBusy(true);
    try {
      const r = await window.omnidl.thumbnailsSaveBulkToFolder(items);
      if (!r.ok) {
        flashHint("Cancelled");
        return;
      }
      flashHint(`Saved ${r.count} file(s)`);
    } finally {
      setThumbBulkBusy(false);
    }
  }, [data, flashHint]);

  const runEnqueueBatch = async () => {
    if (!data?.entries.length || !outDir) return;
    const { label, formatSelector, kind } = selectorFor(mode);
    const items = data.entries.filter((e) => playlistSelectedIds.includes(e.id));
    let n = 0;
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
      n++;
    }
    setLastEnqueueCount(n);
    setEnqueueSuccessOpen(true);
  };

  const openEnqueueConfirm = () => {
    if (!data?.entries.length || !outDir) return;
    const n = data.entries.filter((e) => playlistSelectedIds.includes(e.id)).length;
    if (!n) {
      flashHint("No items selected");
      return;
    }
    setConfirmEnqueueOpen(true);
  };

  return (
    <motion.div
      className="space-y-5"
      variants={stagger.root}
      initial="hidden"
      animate="show"
    >
      <ConfirmModal
        open={confirmEnqueueOpen}
        title="Add to queue?"
        body={`Add ${data?.entries.filter((e) => playlistSelectedIds.includes(e.id)).length ?? 0} selected item(s) to the download queue. Output folder: ${outDir || "—"}`}
        confirmText="Add to queue"
        cancelText="Cancel"
        onClose={() => setConfirmEnqueueOpen(false)}
        onConfirm={() => {
          void runEnqueueBatch();
        }}
      />
      <AnimatePresence>
        {enqueueSuccessOpen ? (
          <motion.div
            className="fixed inset-0 z-[211] flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pl-enq-ok-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="w-full max-w-md border-4 border-[#111] bg-[#fffef8] p-5 shadow-[8px_8px_0_0_#111]"
            >
              <h2
                id="pl-enq-ok-title"
                className="font-display text-lg font-normal uppercase tracking-brutal text-[#111]"
              >
                Added to queue
              </h2>
              <p className="mt-3 text-sm font-bold text-neutral-700">
                {lastEnqueueCount} item(s) were added to the download queue.
              </p>
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEnqueueSuccessOpen(false)}
                  className="border-4 border-[#111] bg-white px-4 py-2.5 text-xs font-black uppercase shadow-[4px_4px_0_0_#111]"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEnqueueSuccessOpen(false);
                    setTab("queue");
                  }}
                  className="border-4 border-[#111] bg-[#4ecdc4] px-4 py-2.5 text-xs font-black uppercase shadow-[4px_4px_0_0_#111]"
                >
                  Open queue
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <motion.div variants={stagger.section}>
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
      </motion.div>

      <AnimatePresence mode="wait">
        {data ? (
          <motion.div
            key={data.title + String(fetchKey)}
            initial={{ opacity: 0, y: animationFull ? 12 : 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: animationFull ? 0.28 : 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <BrutalPanel className="p-5">
              <motion.div
                variants={stagger.root}
                initial="hidden"
                animate="show"
                className="flex flex-col"
              >
              <motion.div variants={stagger.section}>
              <div className="text-lg font-black">{data.title}</div>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs font-bold text-neutral-800">
                <dt className="text-neutral-500">Entries</dt>
                <dd className="text-left">{data.entries.length}</dd>
                <dt className="text-neutral-500">Total duration</dt>
                <dd className="text-left">
                  {playlistDurationStats.knownCount > 0
                    ? formatDuration(playlistDurationStats.totalSec)
                    : "—"}
                  {playlistDurationStats.unknownCount > 0 ? (
                    <span className="ml-1 font-semibold text-neutral-600">
                      ({playlistDurationStats.unknownCount} without length data)
                    </span>
                  ) : null}
                </dd>
              </dl>
              </motion.div>

              {playlistFullThumbnails && data.entries.length > 0 ? (
                <motion.div variants={stagger.section} className="mt-4 border-4 border-[#111] bg-[#fffef8] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black uppercase">
                    <span>HD thumbnails</span>
                    <span className="font-mono text-[11px] font-bold text-neutral-600">
                      {playlistThumbRefinedIds.length} / {data.entries.length}
                      {playlistThumbRefineDone ? " · done" : ""}
                    </span>
                  </div>
                  {!playlistThumbRefineDone ? (
                    <div className="mt-2 h-3 w-full overflow-hidden border-4 border-[#111] bg-neutral-200">
                      <motion.div
                        className="h-full bg-[#4ecdc4]"
                        initial={false}
                        animate={{ width: `${thumbProgress}%` }}
                        transition={{ type: "spring", stiffness: 200, damping: 28 }}
                      />
                    </div>
                  ) : (
                    <p className="mt-2 text-[11px] font-bold text-neutral-600">Done.</p>
                  )}
                </motion.div>
              ) : null}

              {data.entries.some((e) => e.thumbnail) ? (
                <motion.div variants={stagger.section} className="mt-4">
                  <motion.button
                    type="button"
                    disabled={thumbBulkBusy}
                    whileHover={thumbBulkBusy ? undefined : { y: -3 }}
                    whileTap={thumbBulkBusy ? undefined : { scale: 0.99 }}
                    onClick={() => void downloadAllThumbs()}
                    className="w-full border-4 border-[#111] bg-[#a29bfe] px-4 py-4 text-center font-black uppercase tracking-wide shadow-[6px_6px_0_0_#111] disabled:opacity-50"
                  >
                    {thumbBulkBusy ? "Saving…" : "Download all thumbnails"}
                  </motion.button>
                  <p className="mt-2 text-[11px] font-semibold text-neutral-600">001_title.jpg, …</p>
                </motion.div>
              ) : null}

              <motion.div variants={stagger.section} className="mt-5 grid grid-cols-2 gap-3">
                <motion.button
                  type="button"
                  whileHover={{ y: -5, rotate: -0.8, transition: { duration: 0.18 } }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => void copyText(url.trim(), "Link copied")}
                  className="border-4 border-[#111] bg-[#4ecdc4] px-3 py-3 text-left shadow-[4px_4px_0_0_#111] outline-none ring-0 transition-shadow hover:shadow-[7px_7px_0_0_#111] focus-visible:ring-4 focus-visible:ring-[#111]"
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#111]/80">
                    Clipboard
                  </div>
                  <div className="mt-1 font-black leading-tight text-[#111]">Copy playlist URL</div>
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ y: -5, rotate: 0.8, transition: { duration: 0.18 } }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => void copyText(data.title, "Title copied")}
                  className="border-4 border-[#111] bg-[#ffe66d] px-3 py-3 text-left shadow-[4px_4px_0_0_#111] outline-none ring-0 transition-shadow hover:shadow-[7px_7px_0_0_#111] focus-visible:ring-4 focus-visible:ring-[#111]"
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#111]/80">
                    Clipboard
                  </div>
                  <div className="mt-1 line-clamp-2 font-black leading-tight text-[#111]">Copy title</div>
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ y: -5, x: -2, transition: { duration: 0.18 } }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    const u = url.trim();
                    if (u) window.open(u, "_blank", "noopener,noreferrer");
                  }}
                  className="border-4 border-[#111] bg-[#fab1a0] px-3 py-3 text-left shadow-[4px_4px_0_0_#111] outline-none ring-0 transition-shadow hover:shadow-[7px_7px_0_0_#111] focus-visible:ring-4 focus-visible:ring-[#111]"
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#111]/80">
                    Browser
                  </div>
                  <div className="mt-1 font-black leading-tight text-[#111]">Open playlist page</div>
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ y: -5, scale: 1.02, transition: { duration: 0.18 } }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    const lines = [
                      `Playlist: ${data.title}`,
                      `URL: ${url.trim()}`,
                      `Entries: ${data.entries.length}`,
                      playlistDurationStats.knownCount > 0
                        ? `Total duration (sum of known): ${formatDuration(playlistDurationStats.totalSec)}`
                        : "Total duration: — (no per-video length in fetch)",
                      playlistDurationStats.unknownCount > 0
                        ? `Without duration data: ${playlistDurationStats.unknownCount} item(s)`
                        : "",
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
              </motion.div>
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
              <motion.div variants={stagger.section} className="mt-6 flex flex-wrap items-center gap-2">
                <label className="text-xs font-black uppercase">Quality</label>
                <select
                  value={mode}
                  onChange={(e) => setPlaylistMode(e.target.value as PlaylistMode)}
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
                  {playlistSelectedIds.length} / {data.entries.length} selected
                </span>
              </motion.div>
              <motion.div variants={stagger.section} className="mt-3 flex flex-wrap gap-2">
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
                  disabled={!outDir || playlistSelectedIds.length === 0}
                  onClick={() => openEnqueueConfirm()}
                  whileHover={outDir && playlistSelectedIds.length > 0 ? { y: -2 } : undefined}
                  whileTap={outDir && playlistSelectedIds.length > 0 ? { scale: 0.98 } : undefined}
                  className={`inline-flex items-center gap-2 border-4 border-[#111] bg-[#ff6b6b] px-4 py-2 font-black uppercase text-white shadow-[4px_4px_0_0_#111] disabled:opacity-50 ${btnHover}`}
                >
                  <Plus className="h-5 w-5" strokeWidth={2} aria-hidden />
                  Enqueue selected
                </motion.button>
              </motion.div>
              <motion.div variants={stagger.section} className="mt-4 max-h-[70vh] overflow-auto pr-1">
                <motion.div
                  variants={stagger.grid}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {data.entries.map((e) => {
                    const thumbOk =
                      playlistFullThumbnails &&
                      (playlistThumbRefineDone || playlistThumbRefinedIds.includes(e.id));
                    return (
                      <motion.div
                        key={e.id + e.index}
                        variants={stagger.card}
                        className={`flex flex-col border-4 border-[#111] bg-white ${
                          playlistSelectedIds.includes(e.id) ? "ring-2 ring-[#111] ring-offset-2" : ""
                        }`}
                      >
                        <label className="relative flex cursor-pointer flex-col">
                          <span className="absolute left-2 top-2 z-10">
                            <input
                              type="checkbox"
                              checked={playlistSelectedIds.includes(e.id)}
                              onChange={() => toggleOne(e.id)}
                              className="h-4 w-4 border-4 border-[#111]"
                            />
                          </span>
                          {playlistFullThumbnails ? (
                            <span className="absolute right-2 top-2 z-10 border-4 border-[#111] bg-[#fffef8] px-1.5 py-0.5 text-[10px] font-black uppercase text-[#111]">
                              {thumbOk ? "OK" : "…"}
                            </span>
                          ) : null}
                          <div className="aspect-video w-full overflow-hidden border-b-4 border-[#111] bg-neutral-200">
                            {e.thumbnail ? (
                              <img src={e.thumbnail} alt="" className="h-full w-full object-cover" />
                            ) : null}
                          </div>
                          <div className="p-2">
                            <div className="text-[10px] font-black text-neutral-500">#{e.index}</div>
                            <div className="mt-1 line-clamp-3 text-xs font-bold leading-snug">{e.title}</div>
                            {e.thumbnail ? (
                              <motion.button
                                type="button"
                                className="mt-2 w-full border-4 border-[#111] bg-[#fab1a0] px-2 py-1.5 text-[10px] font-black uppercase shadow-[3px_3px_0_0_#111]"
                                whileHover={{ y: -1 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={(ev) => {
                                  ev.preventDefault();
                                  ev.stopPropagation();
                                  void saveEntryThumb(e);
                                }}
                              >
                                Download cover
                              </motion.button>
                            ) : null}
                          </div>
                        </label>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </motion.div>
              </motion.div>
            </BrutalPanel>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
