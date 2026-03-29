import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { BrutalPanel } from "../components/BrutalPanel";

const ease = [0.22, 1, 0.36, 1] as const;

const staggerOuter = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

const staggerGrid = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.11, delayChildren: 0.02 },
  },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
};

const band = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: 0.45, ease } },
};

function Zone({
  step,
  title,
  accent,
  children,
}: {
  step: string;
  title: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      variants={item}
      className="relative overflow-hidden border-4 border-[#111] bg-white shadow-[6px_6px_0_0_#111]"
    >
      <motion.div
        className={`h-1 origin-left ${accent}`}
        variants={band}
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
  return (
    <motion.div className="space-y-10 pb-8" initial="hidden" animate="show" variants={staggerOuter}>
      <motion.div variants={item} className="relative overflow-hidden border-4 border-[#111] bg-[#111] p-6 text-[#faf8f3] shadow-[8px_8px_0_0_#111] sm:p-8">
        <motion.div
          className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 border-4 border-[#4ecdc4] opacity-40"
          animate={{ rotate: [0, 90, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        />
        <div className="relative z-10">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#4ecdc4]">Guide</p>
        <h1 className="font-display mt-2 max-w-2xl text-2xl font-normal uppercase leading-tight tracking-brutal sm:text-3xl">
          How to use OmniDL
        </h1>
        <p className="mt-4 max-w-2xl text-sm font-bold leading-relaxed text-neutral-300">
          Paste a link, fetch metadata, pick a format, choose a folder, then download or queue. Use the
          full-screen loader while Fetch runs so metadata finishes before you switch tasks.
        </p>
        </div>
      </motion.div>

      <motion.section variants={item} className="space-y-4">
        <h2 className="font-display text-sm font-normal uppercase tracking-brutal text-[#111]">
          Quick start
        </h2>
        <motion.div
          className="grid gap-4 sm:grid-cols-2"
          variants={staggerGrid}
          initial="hidden"
          animate="show"
        >
          <Zone step="01" title="Paste or detect" accent="bg-[#4ecdc4]">
            Put a video URL in the Home field. With clipboard detection (Options), supported links can
            appear when you focus Home.
          </Zone>
          <Zone step="02" title="Fetch" accent="bg-[#ffe66d]">
            Press Fetch for a full-screen loader until metadata is ready. With auto-fetch enabled, a slim
            top bar shows progress instead so you can keep using the app.
          </Zone>
          <Zone step="03" title="Quality & folder" accent="bg-[#fab1a0]">
            Choose video or audio, then a format. Pick the save folder with Folder (stored for next time).
          </Zone>
          <Zone step="04" title="Download or queue" accent="bg-[#a29bfe]">
            Download now runs next in the queue. Add to queue appends without starting immediately if
            something else is active.
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
                Inserts the job right after whatever is running (or starts immediately if the queue is
                idle). Best when you want this file next.
              </p>
            </div>
            <div className="border-4 border-[#111] bg-[#ffe66d]/25 p-4">
              <p className="font-mono text-[10px] font-black uppercase tracking-wider text-neutral-600">
                Add to queue
              </p>
              <p className="mt-2 text-sm font-bold text-neutral-800">
                Appends to the end. The queue runs one download at a time in order—good for batching from
                Home or Playlist.
              </p>
            </div>
          </div>
        </BrutalPanel>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div variants={item}>
          <BrutalPanel className="h-full border-[#111] bg-white p-5">
            <h2 className="font-display text-base font-normal uppercase tracking-brutal text-[#111]">
              Playlist tab
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-bold text-neutral-800">
              <li>Paste a YouTube playlist URL and set how many entries to scan (max 100).</li>
              <li>Get playlist loads titles; optional HD thumbnails refine in the background (Options).</li>
              <li>Select videos, choose quality, pick folder, then enqueue selected—same queue rules as Home.</li>
              <li>Fetching the playlist shows the same full-screen loader until the list is ready.</li>
            </ul>
          </BrutalPanel>
        </motion.div>
        <motion.div variants={item}>
          <BrutalPanel className="h-full border-[#111] bg-white p-5">
            <h2 className="font-display text-base font-normal uppercase tracking-brutal text-[#111]">
              Queue · History
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-bold text-neutral-800">
              <li>Queue: pause, cancel, or remove finished rows. Row clicks do not cancel—use the buttons.</li>
              <li>History lists past downloads; Open folder jumps to the file if it still exists.</li>
              <li>Clear finished in Queue only removes completed or failed rows, not active jobs.</li>
            </ul>
          </BrutalPanel>
        </motion.div>
      </div>

      <motion.div variants={item} className="border-4 border-dashed border-[#111] bg-neutral-100/80 p-5 sm:p-6">
        <h2 className="font-display text-base font-normal uppercase tracking-brutal text-[#111]">
          When you see the fetch overlay
        </h2>
        <p className="mt-3 text-sm font-bold leading-relaxed text-neutral-800">
          Manual Fetch on Home and Get playlist on Playlist use a full-screen overlay until the request
          finishes. Auto-fetch on Home uses a thin top bar only so the window stays usable.
        </p>
      </motion.div>

      <motion.div variants={item}>
        <h2 className="font-display text-sm font-normal uppercase tracking-brutal text-[#111]">
          Tips & errors
        </h2>
        <div className="mt-4 space-y-4">
          <BrutalPanel className="p-5">
            <h3 className="font-mono text-xs font-black uppercase tracking-wider text-neutral-500">Queue</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-bold text-neutral-800">
              <li>
                Only use Cancel or Pause on a row to stop a download. Tapping the row does not remove a job.
              </li>
              <li>
                Clear finished removes completed, failed, or cancelled items only. Active downloads stay in
                the queue.
              </li>
              <li>Jobs run one at a time in order.</li>
            </ul>
          </BrutalPanel>
          <BrutalPanel className="p-5">
            <h3 className="font-mono text-xs font-black uppercase tracking-wider text-neutral-500">Network</h3>
            <p className="mt-3 text-sm font-bold text-neutral-800">
              If you see a short network error, check Wi‑Fi or VPN, then use Fetch or download again.
            </p>
          </BrutalPanel>
          <BrutalPanel className="p-5">
            <h3 className="font-mono text-xs font-black uppercase tracking-wider text-neutral-500">
              Sign-in / cookies
            </h3>
            <p className="mt-3 text-sm font-bold text-neutral-800">
              Some sites return a sign-in or cookie message for a short time. Waiting and retrying Fetch or
              download often works without changing anything.
            </p>
          </BrutalPanel>
          <BrutalPanel className="p-5">
            <h3 className="font-mono text-xs font-black uppercase tracking-wider text-neutral-500">
              Extra files (.webm, .part)
            </h3>
            <p className="mt-3 text-sm font-bold text-neutral-800">
              yt-dlp may leave temporary streams while merging. After a successful download, OmniDL tries to
              remove fragments next to the final file. If a download stops halfway, delete leftover .part or
              .f### files yourself.
            </p>
          </BrutalPanel>
          <BrutalPanel className="p-5">
            <h3 className="font-mono text-xs font-black uppercase tracking-wider text-neutral-500">Audio</h3>
            <p className="mt-3 text-sm font-bold text-neutral-800">
              Best audio is saved as MP3 when conversion succeeds (bundled ffmpeg). A failed step may leave
              .webm until you retry.
            </p>
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
