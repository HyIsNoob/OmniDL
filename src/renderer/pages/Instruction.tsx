import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useMemo } from "react";
import type { Variants } from "framer-motion";
import { BrutalPanel } from "../components/BrutalPanel";
import { useSettingsStore } from "../store/settingsUi";

const ease = [0.22, 1, 0.36, 1] as const;

function Zone({
  step,
  title,
  accent,
  children,
  itemVariants,
  bandVariants,
}: {
  step: string;
  title: string;
  accent: string;
  children: ReactNode;
  itemVariants: Variants;
  bandVariants: Variants;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="relative overflow-hidden border-4 border-[#111] bg-white shadow-[6px_6px_0_0_#111]"
    >
      <motion.div
        className={`h-1 origin-left ${accent}`}
        variants={bandVariants}
        initial="hidden"
        animate="show"
      />
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="font-mono text-3xl font-black leading-none text-neutral-300">{step}</span>
          <h3 className="font-display text-base font-normal uppercase tracking-brutal text-[#111]">{title}</h3>
        </div>
        <div className="mt-3 text-sm font-bold leading-relaxed text-neutral-800">{children}</div>
      </div>
    </motion.div>
  );
}

export function Instruction() {
  const full = useSettingsStore((s) => s.animationLevel === "full");
  const { staggerOuter, staggerGrid, item, band } = useMemo(() => {
    const st = (a: number) => (full ? a : 0);
    const dl = (a: number) => (full ? a : 0);
    const dur = (d: number) => (full ? d : 0.02);
    return {
      staggerOuter: {
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: { staggerChildren: st(0.08), delayChildren: dl(0.04) },
        },
      },
      staggerGrid: {
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: { staggerChildren: st(0.11), delayChildren: dl(0.02) },
        },
      },
      item: {
        hidden: { opacity: 0, y: full ? 18 : 0 },
        show: { opacity: 1, y: 0, transition: { duration: dur(0.35), ease } },
      },
      band: {
        hidden: { scaleX: 0 },
        show: { scaleX: 1, transition: { duration: dur(0.45), ease } },
      },
    };
  }, [full]);

  return (
    <motion.div className="space-y-10 pb-8" initial="hidden" animate="show" variants={staggerOuter}>
      <motion.div variants={item} className="relative overflow-hidden border-4 border-[#111] bg-[#111] p-6 text-[#faf8f3] shadow-[8px_8px_0_0_#111] sm:p-8">
        <motion.div
          className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 border-4 border-[#4ecdc4] opacity-40"
          animate={full ? { rotate: [0, 90, 0] } : { rotate: 0 }}
          transition={full ? { duration: 14, repeat: Infinity, ease: "linear" } : { duration: 0 }}
        />
        <div className="relative z-10">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#4ecdc4]">Guide</p>
          <h1 className="font-display mt-2 max-w-2xl text-2xl font-normal uppercase leading-tight tracking-brutal sm:text-3xl">
            How to use OmniDL
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-bold leading-relaxed text-neutral-300">
            Paste a link, fetch, pick format and folder, then download or queue.
          </p>
        </div>
      </motion.div>

      <motion.section variants={item} className="space-y-4">
        <h2 className="font-display text-sm font-normal uppercase tracking-brutal text-[#111]">Quick start</h2>
        <motion.div className="grid gap-4 sm:grid-cols-2" variants={staggerGrid} initial="hidden" animate="show">
          <Zone itemVariants={item} bandVariants={band} step="01" title="Paste or detect" accent="bg-[#4ecdc4]">
            URL on Home. Optional clipboard detect (Options).
          </Zone>
          <Zone itemVariants={item} bandVariants={band} step="02" title="Fetch" accent="bg-[#ffe66d]">
            Fetch or auto-fetch (Options) loads metadata.
          </Zone>
          <Zone itemVariants={item} bandVariants={band} step="03" title="Quality & folder" accent="bg-[#fab1a0]">
            Video or audio, format, and save folder.
          </Zone>
          <Zone itemVariants={item} bandVariants={band} step="04" title="Download or queue" accent="bg-[#a29bfe]">
            Download now = next in queue. Add to queue = end of queue.
          </Zone>
        </motion.div>
      </motion.section>

      <motion.div variants={item}>
        <BrutalPanel className="border-[#111] bg-[#fffef8] p-5 sm:p-6">
          <h2 className="font-display text-base font-normal uppercase tracking-brutal text-[#111]">
            Two ways to send work
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="border-4 border-[#111] bg-[#4ecdc4]/25 p-4">
              <p className="font-mono text-[10px] font-black uppercase tracking-wider text-neutral-600">
                Download now
              </p>
              <p className="mt-2 text-sm font-bold text-neutral-800">
                Next after the current job, or starts if idle.
              </p>
            </div>
            <div className="border-4 border-[#111] bg-[#ffe66d]/25 p-4">
              <p className="font-mono text-[10px] font-black uppercase tracking-wider text-neutral-600">
                Add to queue
              </p>
              <p className="mt-2 text-sm font-bold text-neutral-800">
                Appends at the end. Parallel count is set in Options.
              </p>
            </div>
          </div>
        </BrutalPanel>
      </motion.div>

      <motion.div
        variants={staggerGrid}
        initial="hidden"
        animate="show"
        className="grid gap-6 lg:grid-cols-2"
      >
        <motion.div variants={item}>
          <BrutalPanel className="h-full border-[#111] bg-white p-5">
            <h2 className="font-display text-base font-normal uppercase tracking-brutal text-[#111]">
              Playlist tab
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-bold text-neutral-800">
              <li>Playlist URL and scan limit (max 100).</li>
              <li>Get playlist, optional HD thumbnails (Options).</li>
              <li>Select items, quality, folder, enqueue.</li>
            </ul>
          </BrutalPanel>
        </motion.div>
        <motion.div variants={item}>
          <BrutalPanel className="h-full border-[#111] bg-white p-5">
            <h2 className="font-display text-base font-normal uppercase tracking-brutal text-[#111]">
              Queue · History
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-bold text-neutral-800">
              <li>Queue: pause, cancel, remove completed.</li>
              <li>History: log of completed downloads; remove one entry or clear all (files on disk stay).</li>
            </ul>
          </BrutalPanel>
        </motion.div>
      </motion.div>

      <motion.div variants={item} className="border-4 border-dashed border-[#111] bg-neutral-100/80 p-5 sm:p-6">
        <h2 className="font-display text-base font-normal uppercase tracking-brutal text-[#111]">
          When you see the fetch overlay
        </h2>
        <p className="mt-3 text-sm font-bold leading-relaxed text-neutral-800">
          Fetch and Get playlist use a full-screen overlay until ready. Auto-fetch on Home uses a thin bar.
        </p>
      </motion.div>

      <motion.div variants={item}>
        <h2 className="font-display text-sm font-normal uppercase tracking-brutal text-[#111]">Tips & errors</h2>
        <div className="mt-4 space-y-4">
          <BrutalPanel className="p-5">
            <h3 className="font-mono text-xs font-black uppercase tracking-wider text-neutral-500">Queue</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-bold text-neutral-800">
              <li>Use Pause or Cancel on a row; row click does not stop a job.</li>
              <li>Clear finished removes done/failed/cancelled rows only.</li>
              <li>Parallel downloads: 1–3 in Options.</li>
            </ul>
          </BrutalPanel>
          <BrutalPanel className="p-5">
            <h3 className="font-mono text-xs font-black uppercase tracking-wider text-neutral-500">Network</h3>
            <p className="mt-3 text-sm font-bold text-neutral-800">Retry after checking connection.</p>
          </BrutalPanel>
          <BrutalPanel className="p-5">
            <h3 className="font-mono text-xs font-black uppercase tracking-wider text-neutral-500">
              Sign-in / cookies
            </h3>
            <p className="mt-3 text-sm font-bold text-neutral-800">Sign-in messages: try again later.</p>
          </BrutalPanel>
          <BrutalPanel className="p-5">
            <h3 className="font-mono text-xs font-black uppercase tracking-wider text-neutral-500">
              Extra files (.webm, .part)
            </h3>
            <p className="mt-3 text-sm font-bold text-neutral-800">
              Interrupted downloads may leave .part or temp files next to the output.
            </p>
          </BrutalPanel>
          <BrutalPanel className="p-5">
            <h3 className="font-mono text-xs font-black uppercase tracking-wider text-neutral-500">Audio</h3>
            <p className="mt-3 text-sm font-bold text-neutral-800">Audio saves as MP3 when conversion succeeds.</p>
          </BrutalPanel>
        </div>
      </motion.div>

      <motion.div variants={item}>
        <BrutalPanel className="border-dashed border-[#111] bg-neutral-100/90 p-5 sm:p-6">
          <h2 className="font-display text-sm font-normal uppercase tracking-brutal text-[#111]">Disclaimer</h2>
          <p className="mt-3 text-sm font-bold leading-relaxed text-neutral-800">
            OmniDL is intended for personal, educational use only. Users are responsible for complying with
            applicable copyright laws and the Terms of Service of any platform they access.
          </p>
        </BrutalPanel>
      </motion.div>
    </motion.div>
  );
}
