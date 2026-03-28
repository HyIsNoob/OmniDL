import { AnimatePresence, motion } from "framer-motion";
import { useFetchOverlayStore } from "../store/fetchOverlay";

export function FetchLoadingOverlay() {
  const active = useFetchOverlayStore((s) => s.active);
  const label = useFetchOverlayStore((s) => s.label);
  const variant = useFetchOverlayStore((s) => s.variant);

  return (
    <AnimatePresence>
      {active && variant === "silent" ? (
        <motion.div
          className="pointer-events-none fixed inset-x-0 top-0 z-[280]"
          role="status"
          aria-busy="true"
          aria-live="polite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="flex h-10 items-center justify-center border-b-4 border-[#111] bg-[#fffef8]/95 backdrop-blur-sm">
            <motion.div
              className="absolute inset-x-0 bottom-0 h-1.5 origin-left bg-[#4ecdc4]"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", repeatType: "reverse" }}
            />
            <span className="relative text-[11px] font-black uppercase tracking-[0.2em] text-[#111]">
              {label || "Loading…"}
            </span>
          </div>
        </motion.div>
      ) : null}
      {active && variant === "default" ? (
        <motion.div
          className="fixed inset-0 z-[280] flex items-center justify-center bg-[#0a0a0a]/88 p-6 backdrop-blur-md"
          role="alertdialog"
          aria-modal="true"
          aria-busy="true"
          aria-labelledby="fetch-overlay-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <motion.div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(90deg, #faf8f3 1px, transparent 1px), linear-gradient(#faf8f3 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
            animate={{ backgroundPosition: ["0px 0px", "28px 28px"] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="relative w-full max-w-md border-4 border-[#111] bg-[#fffef8] p-8 shadow-[12px_12px_0_0_#111]"
            initial={{ scale: 0.94, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
          >
            <div className="relative mx-auto h-24 w-24">
              <motion.div
                className="absolute inset-0 border-4 border-dashed border-[#111]"
                animate={{ rotate: 360 }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="absolute inset-3 border-4 border-[#4ecdc4]"
                animate={{ rotate: -360 }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="absolute inset-6 bg-[#ffe66d]"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <p
              id="fetch-overlay-title"
              className="font-display mt-6 text-center text-2xl font-normal uppercase tracking-brutal text-[#111] sm:text-3xl"
            >
              {label || "Loading"}
            </p>
            <p className="mt-2 text-center text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
              Stay on this screen until done
            </p>
            <div className="mt-6 flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-3 w-3 border-4 border-[#111] bg-[#ff6b6b]"
                  animate={{ y: [0, -10, 0], opacity: [0.5, 1, 0.5] }}
                  transition={{
                    duration: 0.7,
                    repeat: Infinity,
                    delay: i * 0.12,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
