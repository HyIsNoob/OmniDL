import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Music, Pause, Play, Trash2, X } from "lucide-react";
import type { QueueJob, QueueState } from "@shared/ipc";
import { BrutalPanel } from "../components/BrutalPanel";
import { useTabContentStagger } from "../lib/tabContentMotion";
import { ConfirmModal } from "../components/ConfirmModal";

const PAGE = 10;

const EMPTY_JOBS: QueueJob[] = [];

const btnHover =
  "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";

type Pending =
  | { type: "clear" }
  | { type: "cancel"; id: string }
  | null;

function QueueThumb({ job }: { job: QueueJob }) {
  if (job.kind === "audio") {
    return (
      <div className="flex h-16 w-20 shrink-0 items-center justify-center border-4 border-[#111] bg-[#a29bfe]">
        <Music className="h-8 w-8 text-[#111]" strokeWidth={2} aria-hidden />
      </div>
    );
  }
  if (job.thumbnailUrl) {
    return (
      <img
        src={job.thumbnailUrl}
        alt=""
        className="h-16 w-20 shrink-0 border-4 border-[#111] object-cover"
      />
    );
  }
  return <div className="h-16 w-20 shrink-0 border-4 border-[#111] bg-neutral-200" aria-hidden />;
}

export function Queue() {
  const stagger = useTabContentStagger();
  const [state, setState] = useState<QueueState | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    void window.omnidl.queueGetState().then(setState);
    const off = window.omnidl.onQueueUpdate(setState);
    return () => {
      off();
    };
  }, []);

  const jobs = state?.jobs ?? EMPTY_JOBS;
  const hasActiveWork = useMemo(
    () => jobs.some((j) => ["downloading", "pending", "paused"].includes(j.status)),
    [jobs],
  );
  const totalPages = Math.max(1, Math.ceil(jobs.length / PAGE));
  const pageClamped = Math.min(Math.max(1, page), totalPages);
  const slice = useMemo(() => {
    const start = (pageClamped - 1) * PAGE;
    return jobs.slice(start, start + PAGE);
  }, [jobs, pageClamped]);

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(jobs.length / PAGE));
    setPage((p) => Math.min(p, tp));
  }, [jobs.length]);

  return (
    <motion.div
      className="space-y-5"
      variants={stagger.root}
      initial="hidden"
      animate="show"
    >
      <ConfirmModal
        open={pending !== null}
        title={pending?.type === "clear" ? "Clear finished?" : "Cancel download?"}
        body={
          pending?.type === "clear"
            ? hasActiveWork
              ? "Only completed, failed, or cancelled rows are removed. Items still downloading or waiting stay in the queue."
              : "Remove completed, failed, or cancelled rows from the list."
            : "The download stops and this row is removed from the queue."
        }
        confirmText={pending?.type === "clear" ? "Clear" : "Cancel"}
        cancelText="Close"
        danger={pending?.type === "cancel"}
        onClose={() => setPending(null)}
        onConfirm={() => {
          if (pending?.type === "clear") void window.omnidl.queueClearCompleted();
          else if (pending?.type === "cancel") void window.omnidl.queueCancel(pending.id);
        }}
      />
      <motion.div variants={stagger.section} className="flex flex-wrap items-center justify-end gap-3">
        <motion.button
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setPending({ type: "clear" })}
          className={`inline-flex items-center gap-2 border-4 border-[#111] bg-white px-3 py-2 text-xs font-black uppercase shadow-[4px_4px_0_0_#111] ${btnHover}`}
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
          Clear finished
        </motion.button>
      </motion.div>
      {!jobs.length && (
        <motion.div variants={stagger.section}>
          <BrutalPanel className="p-8 text-center font-bold text-neutral-500">Empty</BrutalPanel>
        </motion.div>
      )}
      <motion.ul variants={stagger.grid} initial="hidden" animate="show" className="space-y-3">
        <AnimatePresence initial={false}>
          {slice.map((j) => (
            <motion.li
              key={j.id}
              layout
              variants={stagger.listItem}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, x: 14, transition: { duration: 0.2 } }}
            >
              <div className="block w-full text-left">
                <BrutalPanel className="p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="flex flex-1 flex-wrap items-start gap-3">
                      <div className="flex w-8 shrink-0 justify-center pt-1">
                        {j.status === "completed" ? (
                          <Check className="h-6 w-6 text-[#111]" strokeWidth={3} aria-hidden />
                        ) : (
                          <span className="text-[10px] font-black text-neutral-400">—</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-black leading-tight">{j.title}</div>
                        <div className="mt-1 text-xs font-bold text-neutral-600">
                          {j.formatLabel} · {j.kind} · {j.status}
                        </div>
                        {j.status === "downloading" && (
                          <div className="mt-3">
                            <div className="h-3 w-full overflow-hidden border-4 border-[#111] bg-white">
                              <motion.div
                                className="h-full bg-[#4ecdc4]"
                                initial={false}
                                animate={{ width: `${Math.min(100, j.progress)}%` }}
                                transition={{ type: "spring", stiffness: 120, damping: 22 }}
                              />
                            </div>
                            <div className="mt-1 text-xs font-bold text-neutral-700">
                              {j.progress.toFixed(1)}%
                              {j.speed ? ` · ${j.speed}` : ""}
                              {j.eta ? ` · ETA ${j.eta}` : ""}
                            </div>
                          </div>
                        )}
                        {j.error && (
                          <div className="mt-2 text-xs font-bold text-red-700">{j.error}</div>
                        )}
                      </div>
                      <QueueThumb job={j} />
                    </div>
                    <div
                      className="flex flex-wrap gap-2"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {j.status === "downloading" && (
                        <motion.button
                          type="button"
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => void window.omnidl.queuePause(j.id)}
                          className={`inline-flex items-center gap-1 border-4 border-[#111] bg-[#ffe66d] px-2 py-1.5 text-xs font-black uppercase ${btnHover}`}
                        >
                          <Pause className="h-4 w-4" strokeWidth={2} aria-hidden />
                          Pause
                        </motion.button>
                      )}
                      {j.status === "paused" && (
                        <motion.button
                          type="button"
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => void window.omnidl.queueResume(j.id)}
                          className={`inline-flex items-center gap-1 border-4 border-[#111] bg-[#4ecdc4] px-2 py-1.5 text-xs font-black uppercase ${btnHover}`}
                        >
                          <Play className="h-4 w-4" strokeWidth={2} aria-hidden />
                          Resume
                        </motion.button>
                      )}
                      {(j.status === "pending" ||
                        j.status === "downloading" ||
                        j.status === "paused") && (
                        <motion.button
                          type="button"
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setPending({ type: "cancel", id: j.id })}
                          className={`inline-flex items-center gap-1 border-4 border-[#111] bg-white px-2 py-1.5 text-xs font-black uppercase ${btnHover}`}
                        >
                          <X className="h-4 w-4" strokeWidth={2} aria-hidden />
                          Cancel
                        </motion.button>
                      )}
                      {(j.status === "completed" ||
                        j.status === "error" ||
                        j.status === "cancelled") && (
                        <motion.button
                          type="button"
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => void window.omnidl.queueRemove(j.id)}
                          className={`inline-flex items-center gap-1 border-4 border-[#111] bg-neutral-200 px-2 py-1.5 text-xs font-black uppercase ${btnHover}`}
                        >
                          Remove
                        </motion.button>
                      )}
                    </div>
                  </div>
                </BrutalPanel>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
      {jobs.length > PAGE ? (
        <motion.div variants={stagger.section} className="flex flex-wrap items-center justify-center gap-2 text-xs font-black uppercase">
          <button
            type="button"
            disabled={pageClamped <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="border-4 border-[#111] bg-white px-3 py-1.5 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-neutral-600">
            {pageClamped} / {totalPages}
          </span>
          <button
            type="button"
            disabled={pageClamped >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="border-4 border-[#111] bg-white px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </motion.div>
      ) : null}
    </motion.div>
  );
}
