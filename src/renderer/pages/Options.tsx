import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Clipboard, RefreshCw, Sparkles } from "lucide-react";
import { BrutalPanel } from "../components/BrutalPanel";
import { useSettingsStore } from "../store/settingsUi";
import { useUpdateUiStore } from "../store/updateUi";

const btnHover =
  "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";

export function Options() {
  const hydrated = useSettingsStore((s) => s.hydrated);
  const clipboardWatch = useSettingsStore((s) => s.clipboardWatch);
  const autoFetch = useSettingsStore((s) => s.autoFetch);
  const notificationsPush = useSettingsStore((s) => s.notificationsPush);
  const playlistFullThumbnails = useSettingsStore((s) => s.playlistFullThumbnails);
  const setClipboardWatch = useSettingsStore((s) => s.setClipboardWatch);
  const setAutoFetch = useSettingsStore((s) => s.setAutoFetch);
  const setNotificationsPush = useSettingsStore((s) => s.setNotificationsPush);
  const setPlaylistFullThumbnails = useSettingsStore((s) => s.setPlaylistFullThumbnails);
  const pendingInstall = useUpdateUiStore((s) => s.pendingInstall);
  const reopenInstall = useUpdateUiStore((s) => s.reopenInstall);
  const [appV, setAppV] = useState("");
  const [ytV, setYtV] = useState<string | null>(null);
  const [remote, setRemote] = useState<string | null>(null);

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
    <div className="space-y-5">
      <BrutalPanel className="p-5">
        <div className="flex items-center gap-2 text-lg font-black">
          <Clipboard className="h-6 w-6" strokeWidth={2} aria-hidden />
          Clipboard & fetch
        </div>
        <p className="mt-2 text-sm font-semibold text-neutral-600">
          Bật phát hiện link trong clipboard: trích URL https (YouTube / TikTok / Facebook) trong đoạn text. Chỉ tab Home tự dán (kể cả khi vừa chuyển sang Home); tab Playlist không tự dán. Các tab khác không tự dán. Auto-fetch chỉ khi URL ở Home thay đổi.
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
              YouTube / TikTok / Facebook — chỉ khi đang ở tab Home (video, reel, hoặc playlist YouTube)
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
              Tự fetch metadata sau khi URL thay đổi (debounce)
            </span>
          </span>
        </label>
      </BrutalPanel>

      <BrutalPanel className="p-5">
        <div className="text-lg font-black">Playlist</div>
        <p className="mt-2 text-sm font-semibold text-neutral-600">
          Sau khi tải danh sách playlist nhanh (flat), có thể tải lại thumbnail từng video để ảnh rõ hơn (chậm hơn, chạy nền).
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
              Sau Get playlist, tự fetch thumbnail HD từng mục và cập nhật dần trên lưới
            </span>
          </span>
        </label>
      </BrutalPanel>

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
              await window.omnidl.updaterCheck();
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
    </div>
  );
}
