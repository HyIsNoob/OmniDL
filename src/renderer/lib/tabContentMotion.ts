import { useMemo } from "react";
import { useSettingsStore } from "../store/settingsUi";

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function useTabContentStagger() {
  const full = useSettingsStore((s) => s.animationLevel === "full");
  return useMemo(() => {
    const z = (n: number) => (full ? n : 0);
    const dur = (ms: number) => (full ? ms : 0.02);
    const st = (a: number) => (full ? a : 0);
    const dl = (a: number) => (full ? a : 0);
    return {
      full,
      root: {
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: { staggerChildren: st(0.06), delayChildren: dl(0.032) },
        },
      },
      section: {
        hidden: { opacity: 0, y: z(11) },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: dur(0.24), ease },
        },
      },
      grid: {
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: { staggerChildren: st(0.034), delayChildren: dl(0.02) },
        },
      },
      card: {
        hidden: { opacity: 0, y: z(8) },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: dur(0.19), ease },
        },
      },
      listItem: {
        hidden: { opacity: 0, y: z(7) },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: dur(0.2), ease },
        },
      },
    };
  }, [full]);
}
