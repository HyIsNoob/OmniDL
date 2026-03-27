import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { History, Home, Layers, ListVideo, Settings } from "lucide-react";
import { TransitionOverlay } from "./components/TransitionOverlay";
import { Home as HomePage } from "./pages/Home";
import { Queue } from "./pages/Queue";
import { Playlist } from "./pages/Playlist";
import { History as HistoryPage } from "./pages/History";
import { Options } from "./pages/Options";
import { useAppStore } from "./store/app";
import { useHomeUrlStore } from "./store/homeUrl";
import { useSettingsStore } from "./store/settingsUi";
import { looksLikeYoutubePlaylistOnlyUrl, looksLikeYtOrTiktok } from "./lib/url";
import type { TabId } from "@shared/ipc";

const tabs: Array<{
  id: TabId;
  label: string;
  Icon: typeof Home;
}> = [
  { id: "home", label: "Home", Icon: Home },
  { id: "queue", label: "Queue", Icon: Layers },
  { id: "playlist", label: "Playlist", Icon: ListVideo },
  { id: "history", label: "History", Icon: History },
  { id: "options", label: "Options", Icon: Settings },
];

export default function App() {
  const tab = useAppStore((s) => s.tab);
  const setTab = useAppStore((s) => s.setTab);
  const overlayOn = useAppStore((s) => s.overlayOn);
  const sweep = useAppStore((s) => s.sweep);
  const transitionLabel = useAppStore((s) => s.transitionLabel);
  const url = useHomeUrlStore((s) => s.url);
  const setUrl = useHomeUrlStore((s) => s.setUrl);
  const lastClip = useRef("");
  const clipboardWatch = useSettingsStore((s) => s.clipboardWatch);
  const hydrate = useSettingsStore((s) => s.hydrate);
  const [appVersion, setAppVersion] = useState("");

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    void window.omnidl.getVersion().then(setAppVersion);
  }, []);

  useEffect(() => {
    if (!clipboardWatch) return;
    lastClip.current = "";
  }, [clipboardWatch]);

  useEffect(() => {
    const off = window.omnidl.onDownloadDone((p) => {
      if (confirm(`Download finished.\nOpen folder for:\n${p.title}?`)) {
        void window.omnidl.showItemInFolder(p.path);
      }
    });
    return off;
  }, []);

  useEffect(() => {
    const offA = window.omnidl.onUpdaterAvailable((info) => {
      if (confirm(`Update available: ${info.version}. Download?`)) {
        void window.omnidl.updaterDownload();
      }
    });
    const offD = window.omnidl.onUpdaterDownloaded(() => {
      if (confirm("Update downloaded. Restart now?")) {
        void window.omnidl.updaterQuitAndInstall();
      }
    });
    return () => {
      offA();
      offD();
    };
  }, []);

  useEffect(() => {
    if (!clipboardWatch) return;
    const id = window.setInterval(() => {
      void (async () => {
        const t = await window.omnidl.readClipboard();
        if (!t || t === lastClip.current) return;
        if (!looksLikeYtOrTiktok(t) || looksLikeYoutubePlaylistOnlyUrl(t)) return;
        lastClip.current = t.trim();
        setUrl(t.trim());
        setTab("home");
      })();
    }, 600);
    return () => clearInterval(id);
  }, [clipboardWatch, setUrl, setTab]);

  return (
    <div className="flex h-screen min-h-0 bg-[#e8dcc8] text-[#111]">
      <TransitionOverlay active={overlayOn} sweep={sweep} label={transitionLabel} />

      <aside className="relative z-10 flex w-[260px] shrink-0 flex-col border-r-4 border-[#111] bg-[#111] text-[#faf8f3] shadow-[6px_0_0_0_rgba(0,0,0,0.12)]">
        <div className="border-b-4 border-[#2a2a2a] px-4 py-5">
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center border-4 border-[#faf8f3] bg-[#1c1c1c] shadow-[4px_4px_0_0_#faf8f3]">
              <Layers className="h-8 w-8 text-[#faf8f3]" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="font-display text-xl font-normal leading-tight tracking-brutal">OmniDL</div>
              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                YouTube · TikTok
              </div>
            </div>
          </motion.div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Main">
          {tabs.map((t) => {
            const active = tab === t.id;
            const Icon = t.Icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`font-display flex w-full items-center gap-3 rounded-none border-4 px-3 py-3 text-left text-sm font-normal uppercase tracking-brutal transition-colors ${
                  active
                    ? "border-[#faf8f3] bg-[#faf8f3] text-[#111] shadow-[4px_4px_0_0_rgba(250,248,243,0.25)]"
                    : "border-transparent bg-transparent text-[#d4d4d4] hover:border-[#444] hover:bg-[#1e1e1e]"
                }`}
              >
                <Icon className="h-6 w-6 shrink-0" strokeWidth={2} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{t.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t-4 border-[#2a2a2a] px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Build</div>
          <div className="mt-1 font-mono text-xs text-neutral-400">{appVersion || "—"}</div>
          <div className="mt-2 text-[10px] leading-relaxed text-neutral-600">
            Kéo giữa vùng nội dung để cuộn. Sidebar cố định để luôn thấy điều hướng.
          </div>
        </div>
      </aside>

      <div className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="border-b-4 border-[#111] bg-[#fffef8] px-6 py-3 shadow-[0_4px_0_0_rgba(0,0,0,0.08)]">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="font-display text-lg font-normal uppercase tracking-brutal text-[#111]">
              {tabs.find((x) => x.id === tab)?.label ?? tab}
            </h1>
            <span className="text-xs font-bold text-neutral-500">
              {tab === "home" && "Dán link · Fetch · chọn chất lượng"}
              {tab === "queue" && "Tiến trình tải · tạm dừng / hủy"}
              {tab === "playlist" && "Playlist · enqueue hàng loạt"}
              {tab === "history" && "Đã tải · mở thư mục"}
              {tab === "options" && "Clipboard · cập nhật"}
            </span>
          </div>
        </div>

        <main className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-[1400px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                role="tabpanel"
                initial={{ opacity: 0, y: sweep === "down" ? -10 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: sweep === "down" ? -10 : 10 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                {tab === "home" && <HomePage url={url} setUrl={setUrl} />}
                {tab === "queue" && <Queue />}
                {tab === "playlist" && <Playlist />}
                {tab === "history" && <HistoryPage />}
                {tab === "options" && <Options />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
