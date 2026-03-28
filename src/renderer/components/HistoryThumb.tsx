import { useEffect, useState } from "react";
import { Music } from "lucide-react";
import type { DownloadKind } from "@shared/ipc";

export function HistoryThumb({
  path,
  kind,
}: {
  path: string | null;
  kind: DownloadKind;
}) {
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
  if (kind === "audio" && !path) {
    return (
      <div
        className="flex h-20 w-28 shrink-0 items-center justify-center border-4 border-[#111] bg-[#a29bfe]">
        <Music className="h-10 w-10 text-[#111]" strokeWidth={2} aria-hidden />
      </div>
    );
  }
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
