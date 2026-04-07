import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, History, Home, Layers, ListVideo, Search as SearchIcon, Settings } from "lucide-react";
import { DownloadCompleteModal } from "./components/DownloadCompleteModal";
import { DuplicateFileModal } from "./components/DuplicateFileModal";
import { UpdateModal } from "./components/UpdateModal";
import { TransitionOverlay } from "./components/TransitionOverlay";
import { FetchLoadingOverlay } from "./components/FetchLoadingOverlay";
import { Home as HomePage } from "./pages/Home";
import { Search as SearchPage } from "./pages/Search";
import { Queue } from "./pages/Queue";
import { Playlist } from "./pages/Playlist";
import { History as HistoryPage } from "./pages/History";
import { Options } from "./pages/Options";
import { Instruction } from "./pages/Instruction";
import { useAppStore } from "./store/app";
import { useHomeUrlStore } from "./store/homeUrl";
import { useSettingsStore } from "./store/settingsUi";
import { extractFirstYtOrTiktokUrlAny } from "./lib/url";
import type { DuplicateAskPayload, TabId } from "@shared/ipc";
import { useUpdateUiStore } from "./store/updateUi";

const tabs: Array<{
  id: TabId;
  label: string;
  Icon?: typeof Home;
  glyph?: string;
}> = [
  { id: "home", label: "Home", Icon: Home },
  { id: "search", label: "Search", Icon: SearchIcon },
  { id: "queue", label: "Queue", Icon: Layers },
  { id: "playlist", label: "Playlist", Icon: ListVideo },
  { id: "history", label: "History", Icon: History },
  { id: "instruction", label: "Instruction", glyph: "i" },
  { id: "options", label: "Options", Icon: Settings },
];

export default function App() {
  const tab = useAppStore((s) => s.tab);
  const setTab = useAppStore((s) => s.setTab);
  const transitionLocked = useAppStore((s) => s.transitionLocked);
  const overlayOn = useAppStore((s) => s.overlayOn);
  const sweep = useAppStore((s) => s.sweep);
  const transitionLabel = useAppStore((s) => s.transitionLabel);
  const url = useHomeUrlStore((s) => s.url);
  const setUrl = useHomeUrlStore((s) => s.setUrl);
  const lastClip = useRef("");
  const clipboardWatch = useSettingsStore((s) => s.clipboardWatch);
  const animationFull = useSettingsStore((s) => s.animationLevel === "full");
  const hydrate = useSettingsStore((s) => s.hydrate);
  const settingsSavedNotice = useSettingsStore((s) => s.settingsSavedNotice);
  const [appVersion, setAppVersion] = useState("");
  const [downloadDone, setDownloadDone] = useState<{ title: string; path: string } | null>(null);
  const [batchDoneCount, setBatchDoneCount] = useState<number | null>(null);
  const [batchDoneOutputDir, setBatchDoneOutputDir] = useState<string | null>(null);
  const [batchPeekTitle, setBatchPeekTitle] = useState<string | null>(null);
  const batchPeekTimerRef = useRef<number | null>(null);
  const [dupAsk, setDupAsk] = useState<DuplicateAskPayload | null>(null);

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
    const offDone = window.omnidl.onDownloadDone((p) => {
      setBatchDoneCount(null);
      setBatchDoneOutputDir(null);
      setDownloadDone({ title: p.title, path: p.path });
    });
    const offBatch = window.omnidl.onDownloadBatchDone((p) => {
      setDownloadDone(null);
      setBatchDoneCount(p.count);
      setBatchDoneOutputDir(p.outputDir);
    });
    return () => {
      offDone();
      offBatch();
    };
  }, []);

  useEffect(() => {
    const off = window.omnidl.onDownloadBatchPeek((p) => {
      setBatchPeekTitle(p.title);
      if (batchPeekTimerRef.current != null) window.clearTimeout(batchPeekTimerRef.current);
      batchPeekTimerRef.current = window.setTimeout(() => {
        setBatchPeekTitle(null);
        batchPeekTimerRef.current = null;
      }, 2000);
    });
    return () => {
      off();
      if (batchPeekTimerRef.current != null) window.clearTimeout(batchPeekTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const off = window.omnidl.onDuplicateAsk((p) => setDupAsk(p));
    return () => {
      off();
    };
  }, []);

  useEffect(() => {
    const openAvailable = useUpdateUiStore.getState().openAvailable;
    const setProgress = useUpdateUiStore.getState().setProgress;
    const setReady = useUpdateUiStore.getState().setReady;
    const setError = useUpdateUiStore.getState().setError;
    const offA = window.omnidl.onUpdaterAvailable((info) => {
      const ph = useUpdateUiStore.getState().phase;
      if (ph === "downloading" || ph === "ready") return;
      openAvailable(info.version);
    });
    const offP = window.omnidl.onUpdaterProgress((p) => {
      if (useUpdateUiStore.getState().phase === "downloading") {
        setProgress(p);
      }
    });
    const offD = window.omnidl.onUpdaterDownloaded((info) => {
      setReady(info.version || "—");
    });
    const offE = window.omnidl.onUpdaterError((e) => {
      const phase = useUpdateUiStore.getState().phase;
      if (phase === "downloading" || phase === "ready" || phase === "available") {
        setError(e.message);
      }
    });
    return () => {
      offA();
      offP();
      offD();
      offE();
    };
  }, []);

  useEffect(() => {
    if (!clipboardWatch) return;
    if (tab !== "home") return;
    const id = window.setInterval(() => {
      void (async () => {
        const t = await window.omnidl.readClipboard();
        if (!t) return;
        const extracted = extractFirstYtOrTiktokUrlAny(t);
        if (!extracted || extracted === lastClip.current) return;
        lastClip.current = extracted;
        setUrl(extracted);
      })();
    }, 600);
    return () => clearInterval(id);
  }, [clipboardWatch, setUrl, tab]);

  useEffect(() => {
    if (!clipboardWatch) return;
    if (tab !== "home") return;
    void (async () => {
      const t = await window.omnidl.readClipboard();
      if (!t) return;
      const extracted = extractFirstYtOrTiktokUrlAny(t);
      if (!extracted) return;
      lastClip.current = extracted;
      setUrl(extracted);
    })();
  }, [tab, clipboardWatch, setUrl]);

  return (
    <div className="flex h-screen min-h-0 bg-[#e8dcc8] text-[#111]">
      <UpdateModal />
      <DuplicateFileModal
        open={dupAsk != null}
        predictedPath={dupAsk?.predictedPath ?? ""}
        onRedownload={() => {
          if (dupAsk) {
            window.omnidl.duplicateRespond({ jobId: dupAsk.jobId, choice: "redownload" });
          }
          setDupAsk(null);
        }}
        onOpenFolder={() => {
          if (dupAsk) {
            window.omnidl.duplicateRespond({ jobId: dupAsk.jobId, choice: "open" });
          }
          setDupAsk(null);
        }}
        onCancel={() => {
          if (dupAsk) {
            window.omnidl.duplicateRespond({ jobId: dupAsk.jobId, choice: "cancel" });
          }
          setDupAsk(null);
        }}
      />
      <DownloadCompleteModal
        open={downloadDone != null || batchDoneCount != null}
        title={downloadDone?.title ?? ""}
        filePath={downloadDone?.path ?? ""}
        batchCount={batchDoneCount}
        onPlay={() => {
          if (downloadDone?.path) void window.omnidl.openPath(downloadDone.path);
        }}
        onOpenFolder={() => {
          if (downloadDone?.path) void window.omnidl.showItemInFolder(downloadDone.path);
        }}
        onOpenDownloadsFolder={() => {
          if (batchDoneOutputDir) {
            void window.omnidl.openPath(batchDoneOutputDir);
          }
        }}
        onDone={() => {
          setDownloadDone(null);
          setBatchDoneCount(null);
          setBatchDoneOutputDir(null);
        }}
      />
      <TransitionOverlay active={overlayOn} sweep={sweep} label={transitionLabel} />
      <FetchLoadingOverlay />
      <AnimatePresence>
        {settingsSavedNotice ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none fixed bottom-6 right-6 z-[220] max-w-[min(92vw,420px)] border-4 border-[#111] bg-[#86efac] px-4 py-2.5 text-right text-xs font-black uppercase tracking-wide text-[#111] shadow-[6px_6px_0_0_#111]"
            role="status"
          >
            {settingsSavedNotice}
          </motion.div>
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {batchPeekTitle ? (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              setBatchPeekTitle(null);
              if (batchPeekTimerRef.current != null) {
                window.clearTimeout(batchPeekTimerRef.current);
                batchPeekTimerRef.current = null;
              }
            }}
            className="fixed bottom-6 right-6 z-[190] max-w-[min(92vw,420px)] cursor-pointer border-4 border-[#111] bg-[#bbf7d0] px-4 py-2.5 text-left shadow-[6px_6px_0_0_#111]"
            role="status"
          >
            <span className="block text-[10px] font-black uppercase tracking-wide text-neutral-500">
              Downloaded
            </span>
            <span className="mt-0.5 line-clamp-2 text-xs font-bold text-[#111]">{batchPeekTitle}</span>
          </motion.button>
        ) : null}
      </AnimatePresence>

      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
      <aside className="relative z-10 flex w-[260px] shrink-0 flex-col border-r-4 border-[#111] bg-[#111] text-[#faf8f3] shadow-[6px_0_0_0_rgba(0,0,0,0.12)]">
        <div className="border-b-4 border-[#2a2a2a] px-4 py-5">
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center border-4 border-[#faf8f3] bg-[#1c1c1c] shadow-[4px_4px_0_0_#faf8f3]">
              <Download className="h-8 w-8 text-[#faf8f3]" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="font-display text-xl font-normal leading-tight tracking-brutal">OmniDL</div>
              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                YouTube · TikTok · Facebook
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
                disabled={transitionLocked}
                onClick={() => setTab(t.id)}
                className={`font-display flex w-full items-center gap-3 rounded-none border-4 px-3 py-3 text-left text-sm font-normal uppercase tracking-brutal transition-colors disabled:pointer-events-none disabled:opacity-40 ${
                  active
                    ? "border-[#faf8f3] bg-[#faf8f3] text-[#111] shadow-[4px_4px_0_0_rgba(250,248,243,0.25)]"
                    : "border-transparent bg-transparent text-[#d4d4d4] hover:border-[#444] hover:bg-[#1e1e1e]"
                }`}
              >
                {Icon ? (
                  <Icon className="h-6 w-6 shrink-0" strokeWidth={2} aria-hidden />
                ) : (
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center border-2 border-current font-mono text-xs font-black leading-none"
                    aria-hidden
                  >
                    {t.glyph ?? "?"}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">{t.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t-4 border-[#2a2a2a] px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Build</div>
          <div className="mt-1 font-mono text-xs text-neutral-400">{appVersion || "—"}</div>
          <div className="mt-2 text-[10px] leading-relaxed text-neutral-600">
            HyIsNoob - 2026
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
              {tab === "home" && "URL · fetch · quality"}
              {tab === "search" && "Search · open on Home"}
              {tab === "queue" && "Active downloads"}
              {tab === "playlist" && "Playlist · enqueue"}
              {tab === "history" && "Past downloads"}
              {tab === "options" && "Settings"}
              {tab === "instruction" && "How to"}
            </span>
          </div>
        </div>

        <main className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-[1400px]">
            <AnimatePresence mode="wait" initial={false}>
              {animationFull ? (
                <div key={tab} role="tabpanel">
                  {tab === "home" && <HomePage url={url} setUrl={setUrl} />}
                  {tab === "search" && <SearchPage />}
                  {tab === "queue" && <Queue />}
                  {tab === "playlist" && <Playlist />}
                  {tab === "history" && <HistoryPage />}
                  {tab === "instruction" && <Instruction />}
                  {tab === "options" && <Options />}
                </div>
              ) : (
                <motion.div
                  key={tab}
                  role="tabpanel"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.09,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {tab === "home" && <HomePage url={url} setUrl={setUrl} />}
                  {tab === "search" && <SearchPage />}
                  {tab === "queue" && <Queue />}
                  {tab === "playlist" && <Playlist />}
                  {tab === "history" && <HistoryPage />}
                  {tab === "instruction" && <Instruction />}
                  {tab === "options" && <Options />}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
      </div>
    </div>
  );
}
