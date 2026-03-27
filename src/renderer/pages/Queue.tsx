import { useEffect, useState } from "react";
import { Pause, Play, Trash2, X } from "lucide-react";
import type { QueueState } from "@shared/ipc";
import { BrutalPanel } from "../components/BrutalPanel";

export function Queue() {
  const [state, setState] = useState<QueueState | null>(null);

  useEffect(() => {
    void window.omnidl.queueGetState().then(setState);
    const off = window.omnidl.onQueueUpdate(setState);
    return off;
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => void window.omnidl.queueClearCompleted()}
          className="inline-flex items-center gap-2 border-4 border-[#111] bg-white px-3 py-2 text-xs font-black uppercase shadow-[4px_4px_0_0_#111] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
          Clear finished
        </button>
      </div>
      {!state?.jobs.length && (
        <BrutalPanel className="p-8 text-center font-bold text-neutral-500">Trống</BrutalPanel>
      )}
      <ul className="space-y-3">
        {state?.jobs.map((j) => (
          <li key={j.id}>
            <BrutalPanel className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-black leading-tight">{j.title}</div>
                  <div className="mt-1 text-xs font-bold text-neutral-600">
                    {j.formatLabel} · {j.kind} · {j.status}
                  </div>
                  {j.status === "downloading" && (
                    <div className="mt-3">
                      <div className="h-3 w-full border-4 border-[#111] bg-white">
                        <div
                          className="h-full bg-[#4ecdc4] transition-[width] duration-300"
                          style={{ width: `${Math.min(100, j.progress)}%` }}
                        />
                      </div>
                      <div className="mt-1 text-xs font-bold text-neutral-700">
                        {j.progress.toFixed(1)}%
                        {j.speed ? ` · ${j.speed}` : ""}
                        {j.eta ? ` · ETA ${j.eta}` : ""}
                      </div>
                    </div>
                  )}
                  {j.error && <div className="mt-2 text-xs font-bold text-red-700">{j.error}</div>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {j.status === "downloading" && (
                    <button
                      type="button"
                      onClick={() => void window.omnidl.queuePause(j.id)}
                      className="inline-flex items-center gap-1 border-4 border-[#111] bg-[#ffe66d] px-2 py-1.5 text-xs font-black uppercase"
                    >
                      <Pause className="h-4 w-4" strokeWidth={2} aria-hidden />
                      Pause
                    </button>
                  )}
                  {j.status === "paused" && (
                    <button
                      type="button"
                      onClick={() => void window.omnidl.queueResume(j.id)}
                      className="inline-flex items-center gap-1 border-4 border-[#111] bg-[#4ecdc4] px-2 py-1.5 text-xs font-black uppercase"
                    >
                      <Play className="h-4 w-4" strokeWidth={2} aria-hidden />
                      Resume
                    </button>
                  )}
                  {(j.status === "pending" ||
                    j.status === "downloading" ||
                    j.status === "paused") && (
                    <button
                      type="button"
                      onClick={() => void window.omnidl.queueCancel(j.id)}
                      className="inline-flex items-center gap-1 border-4 border-[#111] bg-white px-2 py-1.5 text-xs font-black uppercase"
                    >
                      <X className="h-4 w-4" strokeWidth={2} aria-hidden />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </BrutalPanel>
          </li>
        ))}
      </ul>
    </div>
  );
}
