import { FolderOpen, Play, X } from "lucide-react";

export function DownloadCompleteModal({
  open,
  title,
  filePath,
  onPlay,
  onOpenFolder,
  onDone,
}: {
  open: boolean;
  title: string;
  filePath: string;
  onPlay: () => void;
  onOpenFolder: () => void;
  onDone: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dl-done-title"
    >
      <div className="w-full max-w-md border-4 border-[#111] bg-[#fffef8] p-5 shadow-[8px_8px_0_0_#111]">
        <div className="flex items-start justify-between gap-3">
          <h2 id="dl-done-title" className="font-display text-lg font-normal uppercase tracking-brutal text-[#111]">
            Download finished
          </h2>
          <button
            type="button"
            onClick={onDone}
            className="shrink-0 border-4 border-[#111] bg-white p-1.5 shadow-[3px_3px_0_0_#111] transition-transform active:translate-x-px active:translate-y-px active:shadow-none"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        </div>
        <p className="mt-3 line-clamp-3 text-sm font-bold text-neutral-800">{title}</p>
        <p className="mt-1 break-all font-mono text-[10px] text-neutral-500">{filePath}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onPlay}
            className="inline-flex flex-1 items-center justify-center gap-2 border-4 border-[#111] bg-[#4ecdc4] px-3 py-2.5 text-xs font-black uppercase shadow-[4px_4px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <Play className="h-4 w-4" strokeWidth={2} aria-hidden />
            Play
          </button>
          <button
            type="button"
            onClick={onOpenFolder}
            className="inline-flex flex-1 items-center justify-center gap-2 border-4 border-[#111] bg-[#ffe66d] px-3 py-2.5 text-xs font-black uppercase shadow-[4px_4px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <FolderOpen className="h-4 w-4" strokeWidth={2} aria-hidden />
            Open folder
          </button>
          <button
            type="button"
            onClick={onDone}
            className="w-full border-4 border-[#111] bg-white px-3 py-2.5 text-xs font-black uppercase shadow-[4px_4px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
