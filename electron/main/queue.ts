import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, unlinkSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { Notification, app, shell, type BrowserWindow } from "electron";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import {
  historyAdd,
  historyGetMediaPathByUrl,
  historyUrlExists,
  settingsGet,
} from "./db.js";
import { downloadThumbnail } from "./thumbnail.js";
import { formatYtdlpUserMessage } from "./ytdlp-errors.js";
import { runYtdlp, runYtdlpDownload, type DownloadProgress } from "./ytdlp.js";
import type {
  DuplicateChoice,
  DownloadKind,
  QueueJob,
  QueueState,
} from "../../shared/ipc.js";

function shouldShowOsPush(): boolean {
  return settingsGet("notificationsPush") !== "0";
}

let targetWindow: BrowserWindow | null = null;
const jobs: QueueJob[] = [];
let activeChild: ChildProcessWithoutNullStreams | null = null;
let pumpBusy = false;

export function setQueueWindow(win: BrowserWindow | null): void {
  targetWindow = win;
}

function sortedJobs(): QueueJob[] {
  return [...jobs].sort((a, b) => b.createdAt - a.createdAt);
}

function pushState(): void {
  const state: QueueState = {
    activeId: jobs.find((j) => j.status === "downloading")?.id ?? null,
    jobs: sortedJobs().map((j) => ({ ...j })),
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

function omniSlugForFilename(job: QueueJob): string {
  let label = job.formatLabel.replace(/\s+/g, "-").replace(/[/\\:*?"<>|]/g, "").replace(/-+/g, "-");
  if (!label) label = "media";
  return label;
}

function outputTemplateFor(job: QueueJob): string {
  const slug = omniSlugForFilename(job);
  if (job.duplicateIndex != null && job.duplicateIndex > 0) {
    return `OmniDL_(${slug})_%(title)s [%(id)s] (${job.duplicateIndex}).%(ext)s`;
  }
  return `OmniDL_(${slug})_%(title)s [%(id)s].%(ext)s`;
}

let pendingDuplicate: { jobId: string; resolve: (c: DuplicateChoice) => void } | null = null;

export function duplicateChoiceFromRenderer(jobId: string, choice: DuplicateChoice): void {
  if (!pendingDuplicate || pendingDuplicate.jobId !== jobId) return;
  pendingDuplicate.resolve(choice);
  pendingDuplicate = null;
}

function ytdlpFormatArgs(job: QueueJob): string[] {
  if (job.kind === "audio") {
    return [
      "-f",
      job.formatSelector,
      "-x",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "0",
      "--no-warnings",
      "--newline",
      "--no-playlist",
      "--continue",
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
    "--postprocessor-args",
    "Merger+ffmpeg:-c:v copy -c:a aac -b:a 192k -movflags +faststart",
  ];
}

async function predictOutputPath(job: QueueJob): Promise<string | null> {
  try {
    const out = join(job.outputDir, outputTemplateFor(job));
    const { stdout, code } = await runYtdlp(
      [
        ...ytdlpFormatArgs(job),
        "-o",
        out,
        "--print",
        "%(filepath)s",
        "--skip-download",
        job.url,
      ],
      { maxBuffer: 20 * 1024 * 1024 },
    );
    if (code !== 0) return null;
    const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
    const last = lines[lines.length - 1]?.trim();
    return last && last.length > 0 ? last : null;
  } catch {
    return null;
  }
}

async function resolveDuplicate(job: QueueJob): Promise<"proceed" | "skip" | "abort"> {
  const predicted = await predictOutputPath(job);
  const hist = historyUrlExists(job.url, job.kind);
  const fileExists = predicted != null && existsSync(predicted);
  if (!hist && !fileExists) return "proceed";

  const openTarget =
    fileExists && predicted
      ? predicted
      : historyGetMediaPathByUrl(job.url, job.kind) ?? (predicted ?? undefined);

  if (!targetWindow || targetWindow.isDestroyed()) {
    return "abort";
  }

  const choice = await new Promise<DuplicateChoice>((resolve) => {
    pendingDuplicate = { jobId: job.id, resolve };
    targetWindow!.webContents.send("duplicate:ask", {
      jobId: job.id,
      predictedPath: predicted ?? "",
      historyHit: hist,
      fileExists,
    });
  });

  if (choice === "cancel") return "abort";
  if (choice === "open") {
    if (openTarget && existsSync(openTarget)) {
      shell.showItemInFolder(openTarget);
    }
    return "skip";
  }
  job.duplicateIndex = 1;
  return "proceed";
}

function buildArgs(job: QueueJob): string[] {
  const out = join(job.outputDir, outputTemplateFor(job));
  if (job.kind === "audio") {
    return [
      ...ytdlpFormatArgs(job),
      "-o",
      out,
      job.url,
    ];
  }
  return [...ytdlpFormatArgs(job), "-o", out, job.url];
}

function removeJobFromQueue(job: QueueJob): void {
  const idx = jobs.indexOf(job);
  if (idx >= 0) jobs.splice(idx, 1);
}

function cleanupYtdlpSidecars(outPath: string): void {
  const dir = dirname(outPath);
  const base = basename(outPath);
  const idInName = /\[([^\]]+)\]/.exec(base);
  const idTag = idInName?.[1];
  if (!idTag) return;
  try {
    for (const name of readdirSync(dir)) {
      if (name === base) continue;
      if (!name.includes(`[${idTag}]`)) continue;
      if (/\.f\d+\.\w+$/.test(name) || name.endsWith(".part")) {
        try {
          unlinkSync(join(dir, name));
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore */
  }
}

async function runJob(job: QueueJob): Promise<void> {
  if (!jobs.includes(job)) return;
  const dup = await resolveDuplicate(job);
  if (!jobs.includes(job)) return;
  if (dup === "abort") {
    job.status = "error";
    job.error = "Cancelled";
    removeJobFromQueue(job);
    pushState();
    void pump();
    return;
  }
  if (dup === "skip") {
    removeJobFromQueue(job);
    pushState();
    void pump();
    return;
  }

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
    if (!jobs.includes(job)) {
      void pump();
      return;
    }
    if (job.status === "cancelled") return;
    if (job.status === "paused") return;
    if (code !== 0) {
      job.status = "error";
      job.error = formatYtdlpUserMessage(stderr, code);
      job.progress = 0;
      pushState();
      return;
    }
    job.status = "completed";
    job.progress = 100;
    const outPath = findOutputPath(stderr);
    if (outPath && existsSync(outPath)) {
      job.outputPath = outPath;
      cleanupYtdlpSidecars(outPath);
    } else {
      job.outputPath = job.outputDir;
    }
    const recordId = randomUUID();
    let thumbnailPath: string | null = null;
    if (job.kind === "video" && job.thumbnailUrl) {
      const dest = join(app.getPath("userData"), "thumbnails", `${recordId}.jpg`);
      const ok = await downloadThumbnail(job.thumbnailUrl, dest);
      if (ok && existsSync(dest)) {
        thumbnailPath = dest;
      }
    }
    historyAdd({
      id: recordId,
      url: job.url,
      title: job.title,
      platform: job.platform ?? "unknown",
      mediaPath: job.outputPath ?? job.outputDir,
      quality: job.formatLabel,
      kind: job.kind,
      createdAt: Date.now(),
      thumbnailPath,
    });
    if (shouldShowOsPush() && Notification.isSupported()) {
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
  if (activeChild || pumpBusy) return;
  if (jobs.some((j) => j.status === "paused")) return;
  const next = jobs.find((j) => j.status === "pending");
  if (!next) return;
  pumpBusy = true;
  try {
    await runJob(next);
  } finally {
    pumpBusy = false;
  }
  await pump();
}

export function getQueueState(): QueueState {
  return {
    activeId: jobs.find((j) => j.status === "downloading")?.id ?? null,
    jobs: sortedJobs().map((j) => ({ ...j })),
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
  thumbnailUrl?: string;
  mode: "next" | "end";
}): QueueJob {
  const id = randomUUID();
  const job: QueueJob = {
    id,
    url: payload.url,
    title: payload.title,
    formatLabel: payload.formatLabel,
    formatSelector: payload.formatSelector,
    outputDir: payload.outputDir,
    outputTemplate: "",
    kind: payload.kind,
    platform: payload.platform,
    thumbnailUrl: payload.thumbnailUrl,
    duplicateIndex: null,
    createdAt: Date.now(),
    status: "pending",
    progress: 0,
  };
  job.outputTemplate = outputTemplateFor(job);
  const active =
    jobs.some((j) => j.status === "downloading") || pumpBusy;
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

export function removeJob(id: string): void {
  const job = jobs.find((j) => j.id === id);
  if (!job) return;
  if (job.status === "downloading") {
    job.status = "cancelled";
    activeChild?.kill();
    activeChild = null;
  }
  removeJobFromQueue(job);
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
