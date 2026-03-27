import { useEffect, useState } from "react";

export function HistoryThumb({ path }: { path: string | null }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!path) {
      setSrc(null);
      return;
    }
    let cancelled = false;
    void window.omnidl.readImageDataUrl(path).then((d) => {
      if (!cancelled) setSrc(d);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);
  if (!path) {
    return (
      <div
        className="h-20 w-28 shrink-0 border-4 border-[#111] bg-neutral-200"
        aria-hidden
      />
    );
  }
  if (!src) {
    return (
      <div className="h-20 w-28 shrink-0 animate-pulse border-4 border-[#111] bg-neutral-200" />
    );
  }
  return (
    <img src={src} alt="" className="h-20 w-28 shrink-0 border-4 border-[#111] object-cover" />
  );
}
