import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { YoutubeSearchResult } from "@shared/ipc";
import { formatDuration } from "../lib/format";
import { useTabContentStagger } from "../lib/tabContentMotion";
import { BrutalPanel } from "../components/BrutalPanel";
import { useAppStore } from "../store/app";
import { useHomeUrlStore } from "../store/homeUrl";

const btnMotion =
  "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";

function formatViews(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B views`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K views`;
  return `${n} views`;
}

export function Search() {
  const stagger = useTabContentStagger();
  const setTab = useAppStore((s) => s.setTab);
  const setUrl = useHomeUrlStore((s) => s.setUrl);
  const setFetchHandoff = useHomeUrlStore((s) => s.setFetchHandoff);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<YoutubeSearchResult[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [quickHint, setQuickHint] = useState<string | null>(null);

  const flashHint = useCallback((msg: string) => {
    setQuickHint(msg);
    window.setTimeout(() => setQuickHint(null), 1400);
  }, []);

  const runSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await window.omnidl.searchYoutube(q, 12);
      setResults(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setResults([]);
    } finally {
      setBusy(false);
    }
  };

  const fetchNowOnHome = async (videoUrl: string) => {
    const normalized = await window.omnidl.normalizeUrl(videoUrl.trim());
    const u = normalized || videoUrl.trim();
    setUrl(u);
    setFetchHandoff(u);
    setTab("home");
    flashHint("Loading on Home…");
  };

  const openInBrowser = async (videoUrl: string) => {
    try {
      await window.omnidl.openExternalUrl(videoUrl.trim());
    } catch {
      flashHint("Could not open browser");
    }
  };

  return (
    <motion.div
      className="space-y-5"
      variants={stagger.root}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={stagger.section}>
        <BrutalPanel className="p-5">
          <div className="text-lg font-black uppercase tracking-wide">Search YouTube</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void runSearch();
              }}
              className="min-w-[200px] flex-1 border-4 border-[#111] bg-white px-3 py-2.5 text-sm font-semibold"
              placeholder="Video name or keywords"
            />
            <motion.button
              type="button"
              disabled={busy || !query.trim()}
              whileHover={busy || !query.trim() ? undefined : { y: -2 }}
              whileTap={busy || !query.trim() ? undefined : { scale: 0.98 }}
              onClick={() => void runSearch()}
              className={`inline-flex items-center gap-2 border-4 border-[#111] bg-[#a29bfe] px-4 py-2.5 text-xs font-black uppercase shadow-[4px_4px_0_0_#111] disabled:opacity-50 ${btnMotion}`}
            >
              {busy ? <span className="font-mono">…</span> : null}
              Search
            </motion.button>
          </div>
          {err ? <p className="mt-3 text-sm font-bold text-red-700">{err}</p> : null}
        </BrutalPanel>
      </motion.div>

      {results.length > 0 ? (
        <motion.div variants={stagger.section}>
          <BrutalPanel className="p-5">
            <div className="text-sm font-black uppercase tracking-wide">Results</div>
            <p className="mt-1 text-xs font-semibold text-neutral-600">{results.length} video(s)</p>
            <div className="mt-4 max-h-[75vh] overflow-auto pr-1">
              <motion.div
                variants={stagger.grid}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {results.map((r, i) => (
                  <motion.div
                    key={r.url + i}
                    variants={stagger.card}
                    className="flex flex-col overflow-hidden border-4 border-[#111] bg-white shadow-[4px_4px_0_0_#111]"
                  >
                    <div className="aspect-video w-full overflow-hidden border-b-4 border-[#111] bg-neutral-200">
                      {r.thumbnail ? (
                        <img
                          src={r.thumbnail}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
                      <div className="line-clamp-3 text-sm font-black leading-snug text-[#111]">{r.title}</div>
                      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[11px] font-bold text-neutral-800">
                        <dt className="text-neutral-500">Duration</dt>
                        <dd>
                          {r.duration != null && r.duration > 0 ? formatDuration(r.duration) : "—"}
                        </dd>
                        <dt className="text-neutral-500">Views</dt>
                        <dd>{formatViews(r.viewCount)}</dd>
                        <dt className="text-neutral-500">Channel</dt>
                        <dd className="line-clamp-2">{r.channel || r.uploader || "—"}</dd>
                      </dl>
                      {r.description ? (
                        <p className="line-clamp-4 text-[11px] font-semibold leading-relaxed text-neutral-600">
                          {r.description}
                        </p>
                      ) : null}
                      <div className="mt-auto flex flex-col gap-2 pt-1">
                        <motion.button
                          type="button"
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => void fetchNowOnHome(r.url)}
                          className={`w-full border-4 border-[#111] bg-[#ffe66d] px-3 py-2.5 text-center text-xs font-black uppercase shadow-[3px_3px_0_0_#111] ${btnMotion}`}
                        >
                          Fetch on Home
                        </motion.button>
                        <motion.button
                          type="button"
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => void openInBrowser(r.url)}
                          className={`w-full border-4 border-[#111] bg-[#fab1a0] px-3 py-2.5 text-center text-xs font-black uppercase shadow-[3px_3px_0_0_#111] ${btnMotion}`}
                        >
                          Watch in browser
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
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
          </BrutalPanel>
        </motion.div>
      ) : null}
    </motion.div>
  );
}
