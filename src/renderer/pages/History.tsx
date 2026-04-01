import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FolderOpen, Trash2 } from "lucide-react";
import type { HistoryRow } from "@shared/ipc";
import { BrutalPanel } from "../components/BrutalPanel";
import { useTabContentStagger } from "../lib/tabContentMotion";
import { ConfirmModal } from "../components/ConfirmModal";
import { HistoryThumb } from "../components/HistoryThumb";

const PAGE = 10;

const btnHover =
  "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";

type Pending =
  | { type: "clear" }
  | { type: "remove"; id: number }
  | null;

export function History() {
  const stagger = useTabContentStagger();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [pending, setPending] = useState<Pending>(null);
  const [page, setPage] = useState(1);

  const reload = useCallback(async () => {
    setRows(await window.omnidl.historyList());
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE));
  const pageClamped = Math.min(Math.max(1, page), totalPages);
  const slice = useMemo(() => {
    const start = (pageClamped - 1) * PAGE;
    return rows.slice(start, start + PAGE);
  }, [rows, pageClamped]);

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(rows.length / PAGE));
    setPage((p) => Math.min(p, tp));
  }, [rows.length]);

  return (
    <motion.div
      className="space-y-5"
      variants={stagger.root}
      initial="hidden"
      animate="show"
    >
      <ConfirmModal
        open={pending !== null}
        title={pending?.type === "clear" ? "Clear all history?" : "Remove this entry?"}
        body={
          pending?.type === "clear"
            ? "All history entries will be removed from the app. This cannot be undone."
            : "The entry is removed from the list. Files on disk (if any) are not deleted."
        }
        confirmText={pending?.type === "clear" ? "Clear all" : "Remove"}
        cancelText="Cancel"
        danger
        onClose={() => setPending(null)}
        onConfirm={() => {
          if (pending?.type === "clear") void window.omnidl.historyClear().then(reload);
          else if (pending?.type === "remove")
            void window.omnidl.historyRemove(pending.id).then(reload);
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
          Clear all
        </motion.button>
      </motion.div>
      {!rows.length && (
        <motion.div variants={stagger.section}>
          <BrutalPanel className="p-8 text-center font-bold text-neutral-500">Empty</BrutalPanel>
        </motion.div>
      )}
      <motion.ul variants={stagger.grid} initial="hidden" animate="show" className="space-y-3">
        <AnimatePresence initial={false}>
          {slice.map((h) => (
            <motion.li
              key={h.id}
              layout
              variants={stagger.listItem}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, x: -12, transition: { duration: 0.2 } }}
            >
              <BrutalPanel className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <HistoryThumb path={h.thumbnailPath} kind={h.kind} />
                    <div className="min-w-0 flex-1">
                      <div className="font-black">{h.title}</div>
                      <div className="mt-1 break-all text-xs font-semibold text-neutral-600">{h.url}</div>
                      <div className="mt-1 text-xs font-bold text-neutral-700">
                        {h.quality} · {h.kind} · {new Date(h.createdAt).toLocaleString()}
                      </div>
                      <div className="mt-1 text-xs font-bold">
                        {h.exists ? "File on disk" : "File missing"}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <motion.button
                      type="button"
                      disabled={!h.exists}
                      whileHover={h.exists ? { y: -2 } : undefined}
                      whileTap={h.exists ? { scale: 0.98 } : undefined}
                      onClick={() => void window.omnidl.showItemInFolder(h.mediaPath)}
                      className={`inline-flex items-center gap-2 border-4 border-[#111] bg-[#4ecdc4] px-2 py-1.5 text-xs font-black uppercase disabled:opacity-40 ${btnHover}`}
                    >
                      <FolderOpen className="h-4 w-4" strokeWidth={2} aria-hidden />
                      Open folder
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setPending({ type: "remove", id: h.id })}
                      className={`inline-flex items-center gap-2 border-4 border-[#111] bg-white px-2 py-1.5 text-xs font-black uppercase ${btnHover}`}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
                      Remove
                    </motion.button>
                  </div>
                </div>
              </BrutalPanel>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
      {rows.length > PAGE ? (
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
