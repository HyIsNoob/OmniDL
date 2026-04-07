import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTabContentStagger } from "../lib/tabContentMotion";
import { Bell, Clipboard, RefreshCw, Sparkles } from "lucide-react";
import { BrutalPanel } from "../components/BrutalPanel";
import { ConfirmModal } from "../components/ConfirmModal";
import { useSettingsStore, type AnimationLevel } from "../store/settingsUi";
import { useUpdateUiStore } from "../store/updateUi";

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const btnHover =
  "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";

export function Options() {
  const hydrated = useSettingsStore((s) => s.hydrated);
  const clipboardWatch = useSettingsStore((s) => s.clipboardWatch);
  const autoFetch = useSettingsStore((s) => s.autoFetch);
  const notificationsPush = useSettingsStore((s) => s.notificationsPush);
  const playlistFullThumbnails = useSettingsStore((s) => s.playlistFullThumbnails);
  const animationLevel = useSettingsStore((s) => s.animationLevel);
  const setClipboardWatch = useSettingsStore((s) => s.setClipboardWatch);
  const setAutoFetch = useSettingsStore((s) => s.setAutoFetch);
  const setNotificationsPush = useSettingsStore((s) => s.setNotificationsPush);
  const setPlaylistFullThumbnails = useSettingsStore((s) => s.setPlaylistFullThumbnails);
  const setAnimationLevel = useSettingsStore((s) => s.setAnimationLevel);
  const notifyBatchThreshold = useSettingsStore((s) => s.notifyBatchThreshold);
  const queueConcurrency = useSettingsStore((s) => s.queueConcurrency);
  const setNotifyBatchThreshold = useSettingsStore((s) => s.setNotifyBatchThreshold);
  const setQueueConcurrency = useSettingsStore((s) => s.setQueueConcurrency);
  const pendingInstall = useUpdateUiStore((s) => s.pendingInstall);
  const reopenInstall = useUpdateUiStore((s) => s.reopenInstall);
  const setUpdateError = useUpdateUiStore((s) => s.setError);
  const [appV, setAppV] = useState("");
  const [ytV, setYtV] = useState<string | null>(null);
  const [remote, setRemote] = useState<string | null>(null);
  const [storageCleanable, setStorageCleanable] = useState<number | null>(null);
  const [storageTotal, setStorageTotal] = useState<number | null>(null);
  const [dataPathInfo, setDataPathInfo] = useState<{
    activePath: string;
    portableTargetPath: string;
    portableActive: boolean;
  } | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const stagger = useTabContentStagger();

  const refreshStorage = useCallback(() => {
    void window.omnidl.getStorageStats().then((s) => {
      setStorageCleanable(s.cleanable);
      setStorageTotal(s.total);
    });
    void window.omnidl.getDataPathInfo().then(setDataPathInfo);
  }, []);

  useEffect(() => {
    void (async () => {
      setAppV(await window.omnidl.getVersion());
      setYtV(await window.omnidl.ytdlpGetVersion());
      try {
        setRemote(await window.omnidl.ytdlpGetRemoteTag());
      } catch {
        setRemote(null);
      }
    })();
  }, []);

  useEffect(() => {
    refreshStorage();
  }, [refreshStorage]);

  if (!hydrated) {
    return (
      <BrutalPanel className="p-8 text-center font-black uppercase tracking-wide text-neutral-500">
        Loading…
      </BrutalPanel>
    );
  }

  return (
    <motion.div
      className="space-y-5"
      variants={stagger.root}
      initial="hidden"
      animate="show"
    >
      <ConfirmModal
        open={confirmClearOpen}
        title="Clear cache and local app data?"
        body="This removes the history database, saved thumbnails, and Chromium disk caches under the app profile folder. yt-dlp and ffmpeg copies are kept so downloads still work. Your chosen download folder is not touched. The window will reload."
        confirmText="Clear and reload"
        cancelText="Cancel"
        danger
        onConfirm={() => {
          void window.omnidl.clearCleanableAppData();
        }}
        onClose={() => setConfirmClearOpen(false)}
      />
      <motion.div variants={stagger.section}>
      <BrutalPanel className="p-5">
        <div className="flex items-center gap-2 text-lg font-black">
          <Clipboard className="h-6 w-6" strokeWidth={2} aria-hidden />
          Clipboard & fetch
        </div>
        <p className="mt-2 text-sm font-semibold text-neutral-600">
          When enabled, OmniDL looks for supported https URLs (YouTube, TikTok, Facebook) inside clipboard
          text. Only the Home tab auto-pastes (including right after you switch to Home). Playlist does not
          auto-paste; other tabs do not auto-paste. Auto-fetch runs when the Home URL changes.
        </p>
        <label className="mt-4 flex cursor-pointer items-start gap-3 border-4 border-[#111] bg-white p-3 font-bold transition-colors hover:bg-neutral-50">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4"
            checked={clipboardWatch}
            onChange={(e) => void setClipboardWatch(e.target.checked)}
          />
          <span>
            <span className="font-black uppercase">Detect clipboard</span>
            <span className="mt-1 block text-xs font-semibold text-neutral-600">
              YouTube / TikTok / Facebook — only while you are on Home (video, reel, or YouTube playlist URL)
            </span>
          </span>
        </label>
        <label className="mt-3 flex cursor-pointer items-start gap-3 border-4 border-[#111] bg-white p-3 font-bold transition-colors hover:bg-neutral-50">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4"
            checked={autoFetch}
            onChange={(e) => void setAutoFetch(e.target.checked)}
          />
          <span>
            <span className="font-black uppercase">Auto-fetch</span>
            <span className="mt-1 block text-xs font-semibold text-neutral-600">
              Fetch metadata after the URL changes (debounced)
            </span>
          </span>
        </label>
      </BrutalPanel>
      </motion.div>

      <motion.div variants={stagger.section}>
      <BrutalPanel className="p-5">
        <div className="text-lg font-black">Motion</div>
        <p className="mt-2 text-sm font-semibold text-neutral-600">
          Full animation: spectrum loader, staggered panels on Home, Playlist, Queue, History, Options, and
          Instruction, tab sweep, and a dimmed playlist fetch overlay. Reduced: instant tab content, no
          stagger, darker playlist overlay without blur, static loading blocks (lower CPU/GPU).
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {(
            [
              ["full", "Full animation"],
              ["reduced", "Reduced animation"],
            ] as const
          ).map(([value, title]) => (
            <label
              key={value}
              className={`flex cursor-pointer items-start gap-3 border-4 border-[#111] p-3 font-bold transition-colors hover:bg-neutral-50 ${
                animationLevel === value ? "bg-[#ffe66d]" : "bg-white"
              }`}
            >
              <input
                type="radio"
                name="animationLevel"
                className="mt-1 h-4 w-4"
                checked={animationLevel === value}
                onChange={() => void setAnimationLevel(value as AnimationLevel)}
              />
              <span className="font-black uppercase">{title}</span>
            </label>
          ))}
        </div>
      </BrutalPanel>
      </motion.div>

      <motion.div variants={stagger.section}>
      <BrutalPanel className="p-5">
        <div className="text-lg font-black">Playlist</div>
        <p className="mt-2 text-sm font-semibold text-neutral-600">
          After a fast flat playlist load, you can fetch per-video thumbnails for sharper images (slower, runs
          in the background).
        </p>
        <label className="mt-4 flex cursor-pointer items-start gap-3 border-4 border-[#111] bg-white p-3 font-bold transition-colors hover:bg-neutral-50">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4"
            checked={playlistFullThumbnails}
            onChange={(e) => void setPlaylistFullThumbnails(e.target.checked)}
          />
          <span>
            <span className="font-black uppercase">Full playlist thumbnails</span>
            <span className="mt-1 block text-xs font-semibold text-neutral-600">
              After Get playlist, fetch HD thumbnails per item and update the grid as they arrive
            </span>
          </span>
        </label>
      </BrutalPanel>
      </motion.div>

      <motion.div variants={stagger.section}>
      <BrutalPanel className="p-5">
        <div className="text-lg font-black">Queue</div>
        <p className="mt-2 text-sm font-semibold text-neutral-600">
          How many downloads run at once (each uses yt-dlp). Duplicate prompts still run one at a time.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {([1, 2, 3] as const).map((n) => (
            <label
              key={n}
              className={`flex cursor-pointer items-start gap-3 border-4 border-[#111] p-3 font-bold transition-colors hover:bg-neutral-50 ${
                queueConcurrency === n ? "bg-[#ffe66d]" : "bg-white"
              }`}
            >
              <input
                type="radio"
                name="queueConcurrency"
                className="mt-1 h-4 w-4"
                checked={queueConcurrency === n}
                onChange={() => void setQueueConcurrency(n)}
              />
              <span className="font-black uppercase">
                {n === 1 ? "One at a time" : `${n} parallel downloads`}
              </span>
            </label>
          ))}
        </div>
      </BrutalPanel>
      </motion.div>

      <motion.div variants={stagger.section}>
      <BrutalPanel className="p-5">
        <div className="flex items-center gap-2 text-lg font-black">
          <Bell className="h-6 w-6" strokeWidth={2} aria-hidden />
          Notifications
        </div>
        <p className="mt-2 text-sm font-semibold text-neutral-600">
          When the queue has more jobs than the batch threshold, per-file OS toasts and the in-app completion
          dialog are deferred until the queue is idle; then one summary is shown. Set threshold to 0 to always
          notify per file (same as before).
        </p>
        <label className="mt-4 flex cursor-pointer items-start gap-3 border-4 border-[#111] bg-white p-3 font-bold transition-colors hover:bg-neutral-50">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4"
            checked={notificationsPush}
            onChange={(e) => void setNotificationsPush(e.target.checked)}
          />
          <span>
            <span className="font-black uppercase">System push notifications</span>
            <span className="mt-1 block text-xs font-semibold text-neutral-600">
              Windows notification for completed downloads (default on)
            </span>
          </span>
        </label>
        <label className="mt-4 flex flex-col gap-2 border-4 border-[#111] bg-white p-3 font-bold">
          <span className="font-black uppercase">Batch notification threshold</span>
          <span className="text-xs font-semibold text-neutral-600">
            0 = always show each file. Default 5: when the queue has more than 5 jobs, completion toasts are
            grouped until the queue is idle. You can set 1–1000 for a different threshold.
          </span>
          <input
            type="number"
            min={0}
            max={1000}
            className="mt-1 border-4 border-[#111] bg-[#fffef8] px-2 py-2 font-mono text-sm"
            value={notifyBatchThreshold}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              void setNotifyBatchThreshold(Number.isNaN(v) ? 5 : v);
            }}
          />
        </label>
      </BrutalPanel>
      </motion.div>

      <motion.div variants={stagger.section}>
      <BrutalPanel className="p-5">
        <div className="text-lg font-black">App data location</div>
        <p className="mt-2 text-xs font-semibold leading-relaxed text-neutral-600">
          Paths are <span className="font-black text-neutral-800">per machine</span> (user, drive, install
          path)—not fixed in code. Prefer <span className="font-mono text-[11px]">omnidl-data</span> next to the
          exe when writable; else Roaming. <span className="font-black text-neutral-800">Migrate:</span> first
          launch copies Roaming → that folder once if it was empty. <span className="font-black text-neutral-800">After:</span> if Active is already next to the exe, the old Roaming folder is dead weight—delete it; the app
          will not repopulate it.
        </p>
        {dataPathInfo ? (
          <div className="mt-3 space-y-2 border-4 border-dashed border-neutral-400 bg-white/80 p-3 text-xs font-bold text-neutral-800">
            <div>
              <span className="text-neutral-500">Active (app writes here): </span>
              <span className="break-all font-mono text-[11px]">{dataPathInfo.activePath}</span>
            </div>
            {dataPathInfo.portableActive ? (
              <p className="text-[11px] font-semibold text-neutral-600">Portable mode: data next to the exe.</p>
            ) : (
              <div>
                <span className="text-neutral-500">Preferred if writable: </span>
                <span className="break-all font-mono text-[11px]">{dataPathInfo.portableTargetPath}</span>
              </div>
            )}
          </div>
        ) : null}
        <dl className="mt-4 grid max-w-lg grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm font-bold text-neutral-800">
          <dt className="text-neutral-500">Cleanable (approx.)</dt>
          <dd className="font-mono">
            {storageCleanable != null ? formatBytes(storageCleanable) : "—"}
          </dd>
          <dt className="text-neutral-500">Total folder</dt>
          <dd className="font-mono">{storageTotal != null ? formatBytes(storageTotal) : "—"}</dd>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => refreshStorage()}
            className={`border-4 border-[#111] bg-white px-3 py-2 text-xs font-black uppercase shadow-[4px_4px_0_0_#111] ${btnHover}`}
          >
            Refresh size
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => void window.omnidl.openUserDataFolder()}
            className={`border-4 border-[#111] bg-[#fab1a0] px-3 py-2 text-xs font-black uppercase shadow-[4px_4px_0_0_#111] ${btnHover}`}
          >
            Open folder
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setConfirmClearOpen(true)}
            className={`border-4 border-[#111] bg-[#ff6b6b] px-3 py-2 text-xs font-black uppercase text-white shadow-[4px_4px_0_0_#111] ${btnHover}`}
          >
            Clear cache and app data
          </motion.button>
        </div>
      </BrutalPanel>
      </motion.div>

      <motion.div variants={stagger.section}>
      <BrutalPanel className="p-5">
        <div className="flex items-center gap-2 text-lg font-black">
          <Sparkles className="h-6 w-6" strokeWidth={2} aria-hidden />
          Updates
        </div>
        <div className="mt-3 text-sm font-bold text-neutral-700">
          App: v{appV}
          <br />
          yt-dlp: {ytV ?? "—"}
          {remote ? (
            <>
              <br />
              Latest: {remote}
            </>
          ) : null}
        </div>
        <p className="mt-2 text-xs font-semibold text-neutral-600">
          App updates use a dialog: download progress, then restart to install. You can hide the dialog while
          downloading.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={async () => {
              const v = await window.omnidl.ytdlpEnsure();
              setYtV(v);
            }}
            className={`inline-flex items-center gap-2 border-4 border-[#111] bg-[#ffe66d] px-3 py-2 text-xs font-black uppercase shadow-[4px_4px_0_0_#111] ${btnHover}`}
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2} aria-hidden />
            Update yt-dlp
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={async () => {
              try {
                await window.omnidl.updaterCheck();
              } catch (e: unknown) {
                setUpdateError(e instanceof Error ? e.message : String(e));
              }
            }}
            className={`inline-flex items-center gap-2 border-4 border-[#111] bg-white px-3 py-2 text-xs font-black uppercase shadow-[4px_4px_0_0_#111] ${btnHover}`}
          >
            Check app update
          </motion.button>
          {pendingInstall ? (
            <motion.button
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => reopenInstall()}
              className={`inline-flex items-center gap-2 border-4 border-[#111] bg-[#ff6b6b] px-3 py-2 text-xs font-black uppercase text-white shadow-[4px_4px_0_0_#111] ${btnHover}`}
            >
              Finish update (restart)
            </motion.button>
          ) : null}
        </div>
      </BrutalPanel>
      </motion.div>

      <motion.div variants={stagger.section}>
      <BrutalPanel className="border-dashed border-[#111] bg-neutral-100/90 p-5">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500">Disclaimer</div>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-neutral-800">
          OmniDL is intended for personal, educational use only. Users are responsible for complying with
          applicable copyright laws and the Terms of Service of any platform they access.
        </p>
      </BrutalPanel>
      </motion.div>
    </motion.div>
  );
}
