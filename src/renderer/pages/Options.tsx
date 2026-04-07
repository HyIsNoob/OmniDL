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
  const dataLocationForceAdmin = useSettingsStore((s) => s.dataLocationForceAdmin);
  const setDataLocationForceAdmin = useSettingsStore((s) => s.setDataLocationForceAdmin);
  const pendingInstall = useUpdateUiStore((s) => s.pendingInstall);
  const reopenInstall = useUpdateUiStore((s) => s.reopenInstall);
  const setUpdateError = useUpdateUiStore((s) => s.setError);
  const [appV, setAppV] = useState("");
  const [ytV, setYtV] = useState<string | null>(null);
  const [remote, setRemote] = useState<string | null>(null);
  const [storageCleanable, setStorageCleanable] = useState<number | null>(null);
  const [storageTotal, setStorageTotal] = useState<number | null>(null);
  const [dataPathInfo, setDataPathInfo] = useState<{
    lightPath: string;
    heavyPath: string;
    portableTargetPath: string;
    heavyOnPortable: boolean;
    platform: string;
    isElevated: boolean;
    packaged: boolean;
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
        body="Clears history, thumbnails, and app caches. Download folder is unchanged. Window reloads."
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
          Clipboard: on Home only. Auto-fetch: when the URL on Home changes.
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
              YouTube / TikTok / Facebook on Home
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
            <span className="mt-1 block text-xs font-semibold text-neutral-600">After URL changes</span>
          </span>
        </label>
      </BrutalPanel>
      </motion.div>

      <motion.div variants={stagger.section}>
      <BrutalPanel className="p-5">
        <div className="text-lg font-black">Motion</div>
        <p className="mt-2 text-sm font-semibold text-neutral-600">
          Full: motion and transitions. Reduced: less motion and simpler effects.
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
        <p className="mt-2 text-sm font-semibold text-neutral-600">Optional sharper thumbnails after load.</p>
        <label className="mt-4 flex cursor-pointer items-start gap-3 border-4 border-[#111] bg-white p-3 font-bold transition-colors hover:bg-neutral-50">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4"
            checked={playlistFullThumbnails}
            onChange={(e) => void setPlaylistFullThumbnails(e.target.checked)}
          />
          <span>
            <span className="font-black uppercase">Full playlist thumbnails</span>
            <span className="mt-1 block text-xs font-semibold text-neutral-600">HD per item in background</span>
          </span>
        </label>
      </BrutalPanel>
      </motion.div>

      <motion.div variants={stagger.section}>
      <BrutalPanel className="p-5">
        <div className="text-lg font-black">Queue</div>
        <p className="mt-2 text-sm font-semibold text-neutral-600">
          Parallel downloads. Duplicate prompts stay one at a time.
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
          0 = notify each file. Higher = one summary when the queue clears (busy queue).
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
            <span className="mt-1 block text-xs font-semibold text-neutral-600">When a download finishes</span>
          </span>
        </label>
        <label className="mt-4 flex flex-col gap-2 border-4 border-[#111] bg-white p-3 font-bold">
          <span className="font-black uppercase">Batch notification threshold</span>
          <span className="text-xs font-semibold text-neutral-600">0–1000. Default 5.</span>
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
          Settings, database, and small files stay in your profile (AppData). yt-dlp and FFmpeg use a
          separate folder: <span className="font-mono text-[11px]">omnidl-data</span> next to the app when
          writable, otherwise under the same profile path.
        </p>
        {dataPathInfo ? (
          <div className="mt-3 space-y-2 border-4 border-dashed border-neutral-400 bg-white/80 p-3 text-xs font-bold text-neutral-800">
            <div>
              <span className="text-neutral-500">Profile (settings, DB, thumbnails): </span>
              <span className="break-all font-mono text-[11px]">{dataPathInfo.lightPath}</span>
            </div>
            <div>
              <span className="text-neutral-500">Tools (yt-dlp, FFmpeg): </span>
              <span className="break-all font-mono text-[11px]">{dataPathInfo.heavyPath}</span>
            </div>
            {dataPathInfo.heavyOnPortable ? (
              <p className="text-[11px] font-semibold text-neutral-600">
                Heavy tools are next to the app executable.
              </p>
            ) : (
              <div>
                <span className="text-neutral-500">Preferred for tools if writable: </span>
                <span className="break-all font-mono text-[11px]">{dataPathInfo.portableTargetPath}</span>
              </div>
            )}
            {dataPathInfo.platform === "win32" && dataPathInfo.isElevated ? (
              <p className="text-[11px] font-black uppercase tracking-wide text-emerald-800">
                Administrator session
              </p>
            ) : null}
          </div>
        ) : null}
        {dataPathInfo?.platform === "win32" && dataPathInfo.packaged ? (
          <div className="mt-4 space-y-3 border-4 border-[#111] bg-white p-3">
            <div className="text-xs font-black uppercase">Write access mode</div>
            <label className="flex cursor-pointer items-start gap-3 font-bold transition-colors hover:bg-neutral-50">
              <input
                type="radio"
                name="dataLocMode"
                className="mt-1 h-4 w-4"
                checked={!dataLocationForceAdmin}
                onChange={() => void setDataLocationForceAdmin(false)}
              />
              <span>
                <span className="font-black uppercase">Normal</span>
                <span className="mt-1 block text-xs font-semibold text-neutral-600">
                  Use folder next to the app when writable; otherwise AppData.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 font-bold transition-colors hover:bg-neutral-50">
              <input
                type="radio"
                name="dataLocMode"
                className="mt-1 h-4 w-4"
                checked={dataLocationForceAdmin}
                onChange={() => void setDataLocationForceAdmin(true)}
              />
              <span>
                <span className="font-black uppercase">Force administrator</span>
                <span className="mt-1 block text-xs font-semibold text-neutral-600">
                  UAC on every launch while this is on. Restart applies the change.
                </span>
              </span>
            </label>
          </div>
        ) : dataPathInfo?.platform === "win32" && !dataPathInfo.packaged ? (
          <p className="mt-3 text-xs font-semibold text-neutral-500">
            Administrator mode is for the installed Windows build (not dev).
          </p>
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
        <p className="mt-2 text-xs font-semibold text-neutral-600">Download update, then restart to install.</p>
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
