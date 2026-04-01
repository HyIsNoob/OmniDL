import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTabContentStagger } from "../lib/tabContentMotion";
import { Bell, Clipboard, RefreshCw, Sparkles } from "lucide-react";
import { BrutalPanel } from "../components/BrutalPanel";
import { useSettingsStore, type AnimationLevel } from "../store/settingsUi";
import { useUpdateUiStore } from "../store/updateUi";

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
  const pendingInstall = useUpdateUiStore((s) => s.pendingInstall);
  const reopenInstall = useUpdateUiStore((s) => s.reopenInstall);
  const setUpdateError = useUpdateUiStore((s) => s.setError);
  const [appV, setAppV] = useState("");
  const [ytV, setYtV] = useState<string | null>(null);
  const [remote, setRemote] = useState<string | null>(null);
  const stagger = useTabContentStagger();

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
        <div className="flex items-center gap-2 text-lg font-black">
          <Bell className="h-6 w-6" strokeWidth={2} aria-hidden />
          Notifications
        </div>
        <p className="mt-2 text-sm font-semibold text-neutral-600">
          OS toast when a download completes (in-app dialog with Play / Open folder / Done always shows).
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
