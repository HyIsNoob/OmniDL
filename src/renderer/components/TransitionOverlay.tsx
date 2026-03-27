import { AnimatePresence, motion } from "framer-motion";
import type { TabSweep } from "../store/app";

export function TransitionOverlay({
  active,
  sweep,
  label,
}: {
  active: boolean;
  sweep: TabSweep;
  label: string;
}) {
  const enterFromTop = sweep === "down";
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
          initial={false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 1 }}
        >
          <motion.div
            key={`${sweep}-${label}`}
            className="absolute inset-0 flex items-center justify-center bg-[#141414] opacity-100"
            style={{
              backgroundImage:
                "radial-gradient(circle at center, rgba(255,255,255,0.12) 1px, transparent 1.5px)",
              backgroundSize: "20px 20px",
            }}
            initial={{ y: enterFromTop ? "-100vh" : "100vh" }}
            animate={{ y: 0 }}
            exit={{ y: enterFromTop ? "100vh" : "-100vh" }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="font-display px-6 text-center text-5xl font-normal uppercase leading-none tracking-brutal text-[#faf8f3] sm:text-6xl md:text-7xl"
              style={{ textShadow: "4px 4px 0 #000" }}
              initial={{ opacity: 0, y: enterFromTop ? -20 : 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.2 }}
            >
              {label || "—"}
            </motion.div>
            <div className="pointer-events-none absolute bottom-8 left-0 right-0 text-center font-sans text-[10px] font-bold uppercase tracking-[0.35em] text-neutral-500">
              OmniDL
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
