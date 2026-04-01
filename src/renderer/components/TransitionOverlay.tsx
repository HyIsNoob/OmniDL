import { AnimatePresence, motion } from "framer-motion";
import type { TabSweep } from "../store/app";

const COLS = 10;
const COLORS = [
  "#4ecdc4",
  "#ff6b6b",
  "#ffe66d",
  "#a29bfe",
  "#fab1a0",
  "#111111",
  "#fffef8",
  "#fab1a0",
  "#4ecdc4",
  "#ff6b6b",
];

export function TransitionOverlay({
  active,
  sweep,
  label,
}: {
  active: boolean;
  sweep: TabSweep;
  label: string;
}) {
  const fromBottom = sweep === "down";
  return (
    <AnimatePresence mode="wait">
      {active ? (
        <motion.div
          key={label}
          className="pointer-events-none fixed inset-0 z-[100] flex overflow-hidden"
          initial={false}
        >
          {Array.from({ length: COLS }, (_, i) => (
            <motion.div
              key={i}
              className="h-full flex-1 border-l-4 border-[#111] first:border-l-0"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
              initial={{ y: fromBottom ? "100%" : "-100%" }}
              animate={{ y: 0 }}
              exit={{ y: fromBottom ? "-100%" : "100%" }}
              transition={{
                duration: 0.34,
                delay: i * 0.024,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          ))}
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4">
            <motion.div
              className="max-w-[min(96vw,56rem)] border-4 border-[#111] bg-[#fffef8] px-5 py-4 text-center font-display text-3xl font-normal uppercase leading-none tracking-brutal text-[#111] shadow-[8px_8px_0_0_#111] sm:text-4xl md:text-5xl"
              initial={{ opacity: 0, y: fromBottom ? 12 : -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.06, duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            >
              {label || "—"}
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
