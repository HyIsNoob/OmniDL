import { formatBytes } from "../lib/format";
import { useUpdateUiStore } from "../store/updateUi";

function formatSpeed(bps: number): string {
  if (!Number.isFinite(bps) || bps <= 0) return "—";
  if (bps < 1024) return `${bps.toFixed(0)} B/s`;
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
  return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
}

function normalizePercent(raw: number | undefined): number {
  if (raw == null || !Number.isFinite(raw)) return 0;
  if (raw >= 0 && raw <= 1) return raw * 100;
  return Math.min(100, Math.max(0, raw));
}

export function UpdateModal() {
  const open = useUpdateUiStore((s) => s.open);
  const phase = useUpdateUiStore((s) => s.phase);
  const version = useUpdateUiStore((s) => s.version);
  const progress = useUpdateUiStore((s) => s.progress);
  const errorMessage = useUpdateUiStore((s) => s.errorMessage);
  const startDownloading = useUpdateUiStore((s) => s.startDownloading);
  const closeModal = useUpdateUiStore((s) => s.closeModal);
  const setError = useUpdateUiStore((s) => s.setError);

  if (!open || !phase) return null;

  const pr = progress ?? {
    percent: 0,
    bytesPerSecond: 0,
    transferred: 0,
    total: 0,
  };
  const pct = normalizePercent(pr.percent);

  const onDownload = () => {
    startDownloading();
    void window.omnidl.updaterDownload().catch((e: unknown) => {
      setError(e instanceof Error ? e.message : String(e));
    });
  };

  const onRestart = () => {
    void window.omnidl.updaterQuitAndInstall();
  };

  const onLater = () => {
    closeModal();
  };

  const onDismissError = () => {
    closeModal();
  };

  const title =
    phase === "available"
      ? "Update available"
      : phase === "downloading"
        ? "Downloading update"
        : phase === "ready"
          ? "Update ready"
          : "Update failed";

  return (
    <div
      className="fixed inset-0 z-[205] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upd-modal-title"
    >
      <div className="w-full max-w-md border-4 border-[#111] bg-[#fffef8] p-5 shadow-[8px_8px_0_0_#111]">
        <div className="flex items-start justify-between gap-3">
          <h2
            id="upd-modal-title"
            className="font-display text-lg font-normal uppercase tracking-brutal text-[#111]"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={phase === "error" ? onDismissError : onLater}
            className="shrink-0 border-4 border-[#111] bg-white px-2 py-1 text-xs font-black uppercase shadow-[3px_3px_0_0_#111] active:translate-x-px active:translate-y-px active:shadow-none"
          >
            Close
          </button>
        </div>

        {phase === "available" && (
          <>
            <p className="mt-3 text-sm font-bold text-neutral-800">
              Version <span className="font-mono">{version ?? "—"}</span> is available. Download the installer,
              then restart when you are ready.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={onDownload}
                className="w-full border-4 border-[#111] bg-[#4ecdc4] px-3 py-2.5 text-xs font-black uppercase shadow-[4px_4px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                Download update
              </button>
              <button
                type="button"
                onClick={onLater}
                className="w-full border-4 border-[#111] bg-white px-3 py-2.5 text-xs font-black uppercase shadow-[4px_4px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                Later
              </button>
            </div>
          </>
        )}

        {phase === "downloading" && (
          <>
            <p className="mt-3 text-sm font-bold text-neutral-800">
              Downloading version <span className="font-mono">{version ?? "—"}</span>…
            </p>
            <div className="mt-3 h-5 w-full overflow-hidden border-4 border-[#111] bg-neutral-200">
              <div
                className="h-full bg-[#4ecdc4] transition-[width] duration-150"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-2 font-mono text-[10px] font-bold text-neutral-600">
              <span>{Math.round(pct)}%</span>
              <span>{formatSpeed(pr.bytesPerSecond)}</span>
            </div>
            <p className="mt-1 font-mono text-[10px] text-neutral-500">
              {formatBytes(pr.transferred)} / {formatBytes(pr.total)}
            </p>
            <p className="mt-3 text-xs font-semibold text-neutral-600">
              You can hide this window; the download continues in the background. When finished, you will be
              prompted to restart and install.
            </p>
            <button
              type="button"
              onClick={onLater}
              className="mt-4 w-full border-4 border-[#111] bg-white px-3 py-2.5 text-xs font-black uppercase shadow-[4px_4px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              Hide
            </button>
          </>
        )}

        {phase === "ready" && (
          <>
            <p className="mt-3 text-sm font-bold text-neutral-800">
              Version <span className="font-mono">{version ?? "—"}</span> is downloaded. Restart OmniDL to finish
              installing.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={onRestart}
                className="w-full border-4 border-[#111] bg-[#ff6b6b] px-3 py-2.5 text-xs font-black uppercase text-white shadow-[4px_4px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                Restart and install
              </button>
              <button
                type="button"
                onClick={onLater}
                className="w-full border-4 border-[#111] bg-white px-3 py-2.5 text-xs font-black uppercase shadow-[4px_4px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                Later
              </button>
            </div>
          </>
        )}

        {phase === "error" && (
          <>
            <p className="mt-3 text-sm font-bold text-red-800">{errorMessage ?? "Update failed."}</p>
            <button
              type="button"
              onClick={onDismissError}
              className="mt-5 w-full border-4 border-[#111] bg-white px-3 py-2.5 text-xs font-black uppercase shadow-[4px_4px_0_0_#111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              OK
            </button>
          </>
        )}
      </div>
    </div>
  );
}
