import { AnimatePresence, motion } from "framer-motion";
import { useFetchOverlayStore } from "../store/fetchOverlay";
import { useSettingsStore } from "../store/settingsUi";

const BAR_COLORS = ["#4ecdc4", "#ff6b6b", "#ffe66d", "#a29bfe", "#fab1a0"];

function PlaylistSpectrumMini() {
  const n = 8;
  return (
    <div className="mx-auto flex h-20 items-end justify-center gap-1 border-4 border-[#111] bg-[#1a1a1a] p-2" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <motion.div
          key={i}
          className="h-14 w-2.5 origin-bottom border-4 border-[#111]"
          style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
          animate={{ scaleY: [0.2, 1, 0.4, 0.95, 0.28] }}
          transition={{
            duration: 0.7 + (i % 4) * 0.05,
            repeat: Infinity,
            ease: [0.34, 0.82, 0.42, 1],
            repeatType: "loop",
          }}
        />
      ))}
    </div>
  );
}

function PlaylistStaticMini() {
  return (
    <div className="mx-auto flex h-20 items-center justify-center gap-2 border-4 border-[#111] bg-[#1a1a1a] p-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-12 w-12 border-4 border-[#111] bg-[#ffe66d]" />
      ))}
    </div>
  );
}

export function FetchLoadingOverlay() {
  const active = useFetchOverlayStore((s) => s.active);
  const label = useFetchOverlayStore((s) => s.label);
  const variant = useFetchOverlayStore((s) => s.variant);
  const full = useSettingsStore((s) => s.animationLevel === "full");

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
          transition={{ duration: 0.15 }}
        >
          <div className="flex h-10 items-center justify-center border-b-4 border-[#111] bg-[#fffef8]">
            <motion.div
              className="absolute inset-x-0 bottom-0 h-1.5 origin-left bg-[#4ecdc4]"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", repeatType: "reverse" }}
            />
            <span className="relative text-[11px] font-black uppercase tracking-[0.2em] text-[#111]">
              {label || "Loading…"}
            </span>
          </div>
        </motion.div>
      ) : null}
      {active && variant === "default" ? (
        <motion.div
          className={`fixed inset-0 z-[280] flex items-center justify-center p-6 ${
            full ? "bg-black/78 backdrop-blur-[3px]" : "bg-black/88"
          }`}
          role="alertdialog"
          aria-modal="true"
          aria-busy="true"
          aria-labelledby="fetch-overlay-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="relative w-full max-w-md border-4 border-[#111] bg-[#fffef8] p-8 shadow-[12px_12px_0_0_#111]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {full ? <PlaylistSpectrumMini /> : <PlaylistStaticMini />}
            <p
              id="fetch-overlay-title"
              className="font-display mt-6 text-center text-2xl font-normal uppercase tracking-brutal text-[#111] sm:text-3xl"
            >
              {label || "Loading"}
            </p>
            <p className="mt-2 text-center text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
              You can switch tabs; this finishes in the background
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
