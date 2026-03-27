import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, Trash2, X } from "lucide-react";
import type { QueueState } from "@shared/ipc";
import { BrutalPanel } from "../components/BrutalPanel";
import { ConfirmModal } from "../components/ConfirmModal";

const btnHover =
  "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";

type Pending =
  | { type: "clear" }
  | { type: "cancel"; id: string }
  | null;

export function Queue() {
  const [state, setState] = useState<QueueState | null>(null);
  const [pending, setPending] = useState<Pending>(null);

  useEffect(() => {
    void window.omnidl.queueGetState().then(setState);
    const off = window.omnidl.onQueueUpdate(setState);
    return off;
  }, []);

  return (
    <div className="space-y-5">
      <ConfirmModal
        open={pending !== null}
        title={pending?.type === "clear" ? "Xóa các tác vụ đã xong?" : "Hủy tải?"}
        body={
          pending?.type === "clear"
            ? "Các mục completed / error / cancelled sẽ bị gỡ khỏi danh sách."
            : "Tải sẽ bị dừng và mục bị xóa khỏi hàng đợi."
        }
        confirmText={pending?.type === "clear" ? "Xóa" : "Hủy tải"}
        cancelText="Đóng"
        danger={pending?.type === "cancel"}
        onClose={() => setPending(null)}
        onConfirm={() => {
          if (pending?.type === "clear") void window.omnidl.queueClearCompleted();
          else if (pending?.type === "cancel") void window.omnidl.queueCancel(pending.id);
        }}
      />
      <div className="flex flex-wrap items-center justify-end gap-3">
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
      </div>
      {!state?.jobs.length && (
        <BrutalPanel className="p-8 text-center font-bold text-neutral-500">Trống</BrutalPanel>
      )}
      <ul className="space-y-3">
        <AnimatePresence initial={false}>
          {(state?.jobs ?? []).map((j) => (
            <motion.li
              key={j.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 14, transition: { duration: 0.2 } }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <BrutalPanel className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
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
                    {j.error && <div className="mt-2 text-xs font-bold text-red-700">{j.error}</div>}
                  </div>
                  <div className="flex flex-wrap gap-2">
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
                  </div>
                </div>
              </BrutalPanel>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
