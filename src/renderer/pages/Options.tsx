import { useEffect, useState } from "react";
import { Clipboard, Download, RefreshCw, Sparkles } from "lucide-react";
import { BrutalPanel } from "../components/BrutalPanel";
import { useSettingsStore } from "../store/settingsUi";

export function Options() {
  const hydrated = useSettingsStore((s) => s.hydrated);
  const clipboardWatch = useSettingsStore((s) => s.clipboardWatch);
  const autoFetch = useSettingsStore((s) => s.autoFetch);
  const setClipboardWatch = useSettingsStore((s) => s.setClipboardWatch);
  const setAutoFetch = useSettingsStore((s) => s.setAutoFetch);
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
          Bật phát hiện link trong clipboard sẽ tự điền ô URL ở Home và chuyển sang tab Home. Bỏ qua chỉ URL trang playlist YouTube (playlist?list=…); link video có thêm &list= vẫn nhận. Tab Playlist không tự fetch từ clipboard. Auto-fetch gọi Fetch khi URL hợp lệ thay đổi ở Home.
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
              YouTube / TikTok — bỏ qua URL chỉ playlist; video (kể cả có &list=) vẫn dán vào Home
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
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              const v = await window.omnidl.ytdlpEnsure();
              setYtV(v);
            }}
            className="inline-flex items-center gap-2 border-4 border-[#111] bg-[#ffe66d] px-3 py-2 text-xs font-black uppercase shadow-[4px_4px_0_0_#111]"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2} aria-hidden />
            Update yt-dlp
          </button>
          <button
            type="button"
            onClick={async () => {
              await window.omnidl.updaterCheck();
            }}
            className="inline-flex items-center gap-2 border-4 border-[#111] bg-white px-3 py-2 text-xs font-black uppercase shadow-[4px_4px_0_0_#111]"
          >
            Check app update
          </button>
          <button
            type="button"
            onClick={() => void window.omnidl.updaterDownload()}
            className="inline-flex items-center gap-2 border-4 border-[#111] bg-[#4ecdc4] px-3 py-2 text-xs font-black uppercase shadow-[4px_4px_0_0_#111]"
          >
            <Download className="h-4 w-4" strokeWidth={2} aria-hidden />
            Download app update
          </button>
          <button
            type="button"
            onClick={() => void window.omnidl.updaterQuitAndInstall()}
            className="inline-flex items-center gap-2 border-4 border-[#111] bg-[#ff6b6b] px-3 py-2 text-xs font-black uppercase text-white shadow-[4px_4px_0_0_#111]"
          >
            Restart & install
          </button>
        </div>
      </BrutalPanel>
    </div>
  );
}
