export function DownloadCompleteModal({
  open,
  title,
  filePath,
  batchCount,
  onPlay,
  onOpenFolder,
  onDone,
}: {
  open: boolean;
  title: string;
  filePath: string;
  batchCount?: number | null;
  onPlay: () => void;
  onOpenFolder: () => void;
  onDone: () => void;
}) {
  if (!open) return null;
  const batch = batchCount != null && batchCount > 0;
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
            {batch ? "Queue finished" : "Download finished"}
          </h2>
          <button
            type="button"
            onClick={onDone}
            className="shrink-0 border-4 border-[#111] bg-white px-2 py-1 text-[10px] font-black uppercase shadow-[3px_3px_0_0_#111] transition-transform active:translate-x-px active:translate-y-px active:shadow-none"
          >
            Close
          </button>
        </div>
        {batch ? (
          <>
            <p className="mt-3 text-sm font-bold text-neutral-800">
              {batchCount} download(s) completed. Per-item alerts were grouped while the queue was longer than
              your threshold.
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={onDone}
                className="w-full border-4 border-[#111] bg-white px-3 py-2.5 text-xs font-black uppercase shadow-[4px_4px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 line-clamp-3 text-sm font-bold text-neutral-800">{title}</p>
            <p className="mt-1 break-all font-mono text-[10px] text-neutral-500">{filePath}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onPlay}
                className="inline-flex flex-1 items-center justify-center border-4 border-[#111] bg-[#4ecdc4] px-3 py-2.5 text-xs font-black uppercase shadow-[4px_4px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                Play
              </button>
              <button
                type="button"
                onClick={onOpenFolder}
                className="inline-flex flex-1 items-center justify-center border-4 border-[#111] bg-[#ffe66d] px-3 py-2.5 text-xs font-black uppercase shadow-[4px_4px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
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
          </>
        )}
      </div>
    </div>
  );
}
