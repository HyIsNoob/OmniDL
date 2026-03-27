import { AnimatePresence, motion } from "framer-motion";

export function ConfirmModal({
  open,
  title,
  body,
  confirmText,
  cancelText,
  danger,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmText: string;
  cancelText: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            role="alertdialog"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-desc"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md border-4 border-[#111] bg-[#fffef8] p-5 shadow-[8px_8px_0_0_#111]"
          >
            <h2 id="confirm-title" className="font-display text-lg font-normal uppercase tracking-brutal text-[#111]">
              {title}
            </h2>
            <p id="confirm-desc" className="mt-3 text-sm font-bold text-neutral-700">
              {body}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="border-4 border-[#111] bg-white px-4 py-2.5 text-xs font-black uppercase shadow-[4px_4px_0_0_#111] transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`border-4 border-[#111] px-4 py-2.5 text-xs font-black uppercase shadow-[4px_4px_0_0_#111] transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                  danger ? "bg-[#ff6b6b] text-white" : "bg-[#4ecdc4] text-[#111]"
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
