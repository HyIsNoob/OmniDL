import { useEffect } from "react";

export function DuplicateFileModal({
  open,
  predictedPath,
  onRedownload,
  onOpenFolder,
  onCancel,
}: {
  open: boolean;
  predictedPath: string;
  onRedownload: () => void;
  onOpenFolder: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dup-file-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="w-full max-w-md border-4 border-[#111] bg-[#fffef8] p-5 shadow-[8px_8px_0_0_#111]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="dup-file-title"
            className="font-display text-lg font-normal uppercase tracking-brutal text-[#111]"
          >
            File already exists
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 border-4 border-[#111] bg-white px-2 py-1 text-xs font-black uppercase shadow-[3px_3px_0_0_#111] active:translate-x-px active:translate-y-px active:shadow-none"
          >
            Close
          </button>
        </div>
        <p className="mt-3 text-sm font-bold text-neutral-800">
          A file with the same output name already exists in the current download folder.
        </p>
        {predictedPath ? (
          <p className="mt-2 break-all font-mono text-[10px] text-neutral-500">{predictedPath}</p>
        ) : null}
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onRedownload}
            className="w-full border-4 border-[#111] bg-[#4ecdc4] px-3 py-2.5 text-xs font-black uppercase shadow-[4px_4px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            Download as (1)
          </button>
          <button
            type="button"
            onClick={onOpenFolder}
            className="w-full border-4 border-[#111] bg-[#ffe66d] px-3 py-2.5 text-xs font-black uppercase shadow-[4px_4px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            Open folder
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full border-4 border-[#111] bg-white px-3 py-2.5 text-xs font-black uppercase shadow-[4px_4px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
