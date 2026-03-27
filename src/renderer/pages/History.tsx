import { useCallback, useEffect, useState } from "react";
import { FolderOpen, Trash2 } from "lucide-react";
import type { HistoryRow } from "@shared/ipc";
import { BrutalPanel } from "../components/BrutalPanel";

export function History() {
  const [rows, setRows] = useState<HistoryRow[]>([]);

  const reload = useCallback(async () => {
    setRows(await window.omnidl.historyList());
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => void window.omnidl.historyClear().then(reload)}
          className="inline-flex items-center gap-2 border-4 border-[#111] bg-white px-3 py-2 text-xs font-black uppercase shadow-[4px_4px_0_0_#111]"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
          Clear all
        </button>
      </div>
      {!rows.length && (
        <BrutalPanel className="p-8 text-center font-bold text-neutral-500">Trống</BrutalPanel>
      )}
      <ul className="space-y-3">
        {rows.map((h) => (
          <li key={h.id}>
            <BrutalPanel className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-black">{h.title}</div>
                  <div className="mt-1 break-all text-xs font-semibold text-neutral-600">{h.url}</div>
                  <div className="mt-1 text-xs font-bold text-neutral-700">
                    {h.quality} · {h.kind} · {new Date(h.createdAt).toLocaleString()}
                  </div>
                  <div className="mt-1 text-xs font-bold">
                    {h.exists ? "Còn file" : "Đã xóa file"}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={!h.exists}
                    onClick={() => void window.omnidl.showItemInFolder(h.mediaPath)}
                    className="inline-flex items-center gap-2 border-4 border-[#111] bg-[#4ecdc4] px-2 py-1.5 text-xs font-black uppercase disabled:opacity-40"
                  >
                    <FolderOpen className="h-4 w-4" strokeWidth={2} aria-hidden />
                    Open folder
                  </button>
                  <button
                    type="button"
                    onClick={() => void window.omnidl.historyRemove(h.id).then(reload)}
                    className="inline-flex items-center gap-2 border-4 border-[#111] bg-white px-2 py-1.5 text-xs font-black uppercase"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
                    Remove
                  </button>
                </div>
              </div>
            </BrutalPanel>
          </li>
        ))}
      </ul>
    </div>
  );
}
