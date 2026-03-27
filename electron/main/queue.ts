import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Notification, type BrowserWindow } from "electron";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { historyAdd } from "./db.js";
import { runYtdlpDownload, type DownloadProgress } from "./ytdlp.js";
import type { DownloadKind, QueueJob, QueueState } from "../../shared/ipc.js";

let targetWindow: BrowserWindow | null = null;
const jobs: QueueJob[] = [];
let activeChild: ChildProcessWithoutNullStreams | null = null;

export function setQueueWindow(win: BrowserWindow | null): void {
  targetWindow = win;
}

function pushState(): void {
  const state: QueueState = {
    activeId: jobs.find((j) => j.status === "downloading")?.id ?? null,
    jobs: jobs.map((j) => ({ ...j })),
  };
  if (targetWindow && !targetWindow.isDestroyed()) {
    targetWindow.webContents.send("queue:update", state);
  }
}

function findOutputPath(stderr: string): string | undefined {
  const m1 = /Merging formats into "(.+?)"/.exec(stderr);
  if (m1?.[1]) return m1[1].replace(/\\\\/g, "\\");
  const m2 = /\[download\] Destination:\s*(.+)/.exec(stderr);
  if (m2?.[1]) return m2[1].trim();
  const m3 = /\[ExtractAudio\] Destination:\s*(.+)/.exec(stderr);
  if (m3?.[1]) return m3[1].trim();
  const m4 = /\[Fixup\w*\].*"(.+?)"/.exec(stderr);
  if (m4?.[1]) return m4[1];
  return undefined;
}

function buildArgs(job: QueueJob): string[] {
  const out = join(job.outputDir, "%(title)s [%(id)s].%(ext)s");
  if (job.kind === "audio") {
    return [
      "-f",
      job.formatSelector,
      "--no-warnings",
      "--newline",
      "--no-playlist",
      "--continue",
      "-o",
      out,
      job.url,
    ];
  }
  return [
    "-f",
    job.formatSelector,
    "--no-warnings",
    "--newline",
    "--no-playlist",
    "--continue",
    "--merge-output-format",
    "mp4",
    "-o",
    out,
    job.url,
  ];
}

async function runJob(job: QueueJob): Promise<void> {
  job.status = "downloading";
  job.progress = 0;
  job.speed = undefined;
  job.eta = undefined;
  pushState();
  const args = buildArgs(job);
  const { child, promise } = runYtdlpDownload(args, {
    onProgress: (p: DownloadProgress) => {
      job.progress = p.percent;
      job.speed = p.speed;
      job.eta = p.eta;
      pushState();
    },
  });
  activeChild = child;
  try {
    const { code, stderr } = await promise;
    if (job.status === "cancelled") return;
    if (job.status === "paused") return;
    if (code !== 0) {
      job.status = "error";
      job.error = `yt-dlp exited with ${code}`;
      job.progress = 0;
      pushState();
      return;
    }
    job.status = "completed";
    job.progress = 100;
    const outPath = findOutputPath(stderr);
    if (outPath && existsSync(outPath)) {
      job.outputPath = outPath;
    } else {
      job.outputPath = job.outputDir;
    }
    historyAdd({
      id: randomUUID(),
      url: job.url,
      title: job.title,
      platform: job.platform ?? "unknown",
      mediaPath: job.outputPath ?? job.outputDir,
      quality: job.formatLabel,
      kind: job.kind,
      createdAt: Date.now(),
    });
    if (Notification.isSupported()) {
      new Notification({ title: "Download complete", body: job.title }).show();
    }
    if (targetWindow && !targetWindow.isDestroyed()) {
      targetWindow.webContents.send("download:done", {
        title: job.title,
        path: job.outputPath ?? job.outputDir,
      });
    }
    pushState();
  } finally {
    activeChild = null;
  }
}

async function pump(): Promise<void> {
  if (activeChild) return;
  if (jobs.some((j) => j.status === "paused")) return;
  const next = jobs.find((j) => j.status === "pending");
  if (!next) return;
  await runJob(next);
  await pump();
}

export function getQueueState(): QueueState {
  return {
    activeId: jobs.find((j) => j.status === "downloading")?.id ?? null,
    jobs: jobs.map((j) => ({ ...j })),
  };
}

export function addJob(payload: {
  url: string;
  title: string;
  formatLabel: string;
  formatSelector: string;
  outputDir: string;
  kind: DownloadKind;
  platform?: string;
  mode: "next" | "end";
}): QueueJob {
  const job: QueueJob = {
    id: randomUUID(),
    url: payload.url,
    title: payload.title,
    formatLabel: payload.formatLabel,
    formatSelector: payload.formatSelector,
    outputDir: payload.outputDir,
    outputTemplate: "%(title)s [%(id)s].%(ext)s",
    kind: payload.kind,
    platform: payload.platform,
    status: "pending",
    progress: 0,
  };
  const active = jobs.some((j) => j.status === "downloading");
  if (!active) {
    jobs.push(job);
    void pump();
    pushState();
    return job;
  }
  if (payload.mode === "next") {
    const di = jobs.findIndex((j) => j.status === "downloading");
    jobs.splice(di + 1, 0, job);
  } else {
    jobs.push(job);
  }
  pushState();
  return job;
}

export function pauseJob(id: string): void {
  const job = jobs.find((j) => j.id === id);
  if (!job || job.status !== "downloading") return;
  job.status = "paused";
  activeChild?.kill();
  activeChild = null;
  pushState();
}

export function resumeJob(id: string): void {
  const job = jobs.find((j) => j.id === id);
  if (!job || job.status !== "paused") return;
  job.status = "pending";
  void pump();
  pushState();
}

export function cancelJob(id: string): void {
  const job = jobs.find((j) => j.id === id);
  if (!job) return;
  if (job.status === "downloading") {
    job.status = "cancelled";
    activeChild?.kill();
    activeChild = null;
  } else {
    job.status = "cancelled";
  }
  const idx = jobs.indexOf(job);
  if (idx >= 0) jobs.splice(idx, 1);
  void pump();
  pushState();
}

export function clearCompleted(): void {
  for (let i = jobs.length - 1; i >= 0; i--) {
    if (
      jobs[i].status === "completed" ||
      jobs[i].status === "cancelled" ||
      jobs[i].status === "error"
    ) {
      jobs.splice(i, 1);
    }
  }
  pushState();
}
