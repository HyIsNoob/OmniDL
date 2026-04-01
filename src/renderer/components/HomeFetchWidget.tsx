import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useHomeFetchUiStore, type HomeFetchPhase } from "../store/homeFetchUi";
import { useSettingsStore } from "../store/settingsUi";

const BAR_COLORS = ["#4ecdc4", "#ff6b6b", "#ffe66d", "#a29bfe", "#fab1a0"];

function BrutalSpectrumCompact({ full }: { full: boolean }) {
  const n = 12;
  if (!full) {
    return (
      <div className="flex h-12 items-center justify-center gap-2 border-4 border-[#111] bg-[#1a1a1a] px-2 py-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-8 w-6 border-4 border-[#111] bg-[#ffe66d]" />
        ))}
      </div>
    );
  }
  return (
    <div
      className="flex h-14 max-w-[min(100%,320px)] items-end justify-center gap-0.5 border-4 border-[#111] bg-[#1a1a1a] px-2 py-1.5"
      aria-hidden
    >
      {Array.from({ length: n }, (_, i) => (
        <motion.div
          key={i}
          className="h-12 w-2 max-w-[10px] flex-1 origin-bottom border-2 border-[#111] sm:w-2.5"
          style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
          animate={{ scaleY: [0.18, 1, 0.42, 0.88, 0.28, 1, 0.5] }}
          transition={{
            duration: 0.78 + (i % 6) * 0.05,
            repeat: Infinity,
            ease: [0.33, 0.78, 0.45, 1],
            repeatType: "loop",
          }}
        />
      ))}
    </div>
  );
}

function EllipsisDots() {
  return (
    <span className="inline-flex w-[1.1em] justify-start gap-0.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block h-1 w-1 bg-current"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            delay: i * 0.18,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}

function boxClass(phase: HomeFetchPhase): string {
  if (phase === "success") return "border-4 border-[#111] bg-[#4ade80] text-[#111]";
  if (phase === "error") return "border-4 border-[#111] bg-[#f87171] text-[#111]";
  return "border-4 border-[#111] bg-[#ffe66d] text-[#111]";
}

export function HomeFetchWidget() {
  const phase = useHomeFetchUiStore((s) => s.phase);
  const dismiss = useHomeFetchUiStore((s) => s.dismiss);
  const animationFull = useSettingsStore((s) => s.animationLevel === "full");

  useEffect(() => {
    if (phase !== "success" && phase !== "error") return;
    const id = window.setTimeout(() => dismiss(), 2000);
    return () => clearTimeout(id);
  }, [phase, dismiss]);

  const show = phase !== "idle";
  const showSpectrum = phase === "fetching";
  const title =
    phase === "fetching" ? (
      <>
        Fetching
        <EllipsisDots />
      </>
    ) : phase === "success" ? (
      "Success"
    ) : phase === "error" ? (
      "Failed"
    ) : null;

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          key={phase}
          className="pointer-events-auto fixed bottom-6 right-6 z-30 flex max-w-[min(calc(100vw-2rem),320px)] flex-col gap-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="status"
          aria-live="polite"
        >
          {showSpectrum ? <BrutalSpectrumCompact full={animationFull} /> : null}
          <button
            type="button"
            onClick={() => dismiss()}
            className={`w-full cursor-pointer px-4 py-3 text-left text-xs font-black uppercase tracking-[0.14em] shadow-[6px_6px_0_0_#111] ${boxClass(phase)}`}
          >
            <span className="flex flex-wrap items-center gap-x-1">{title}</span>
            {phase === "success" || phase === "error" ? (
              <span className="mt-1 block text-[10px] font-bold normal-case tracking-normal opacity-85">
                Click to close
              </span>
            ) : null}
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
