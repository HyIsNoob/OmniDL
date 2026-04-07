import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { mediaFileExistsOnDisk, resolveExistingMediaPath, revealPathInExplorer } from "./fs-utils.js";
import { basename, dirname, join, normalize } from "node:path";
import { Notification, app, type BrowserWindow } from "electron";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { historyAdd, settingsGet } from "./db.js";
import { extractYoutubeVideoIdFromUrl, normalizeVideoUrl } from "./url.js";
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

function getNotifyBatchThreshold(): number {
  const v = settingsGet("notifyBatchThreshold");
  if (v == null || v === "") return 5;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : 5;
}

function getMaxConcurrency(): number {
  const v = settingsGet("queueConcurrency");
  const n = v == null || v === "" ? 1 : parseInt(v, 10);
  if (!Number.isFinite(n)) return 1;
  return Math.min(3, Math.max(1, n));
}

let completionBatchCount = 0;

let duplicateMutex = Promise.resolve();

async function withDuplicateLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = duplicateMutex.then(() => fn());
  duplicateMutex = run.then(() => {}).catch(() => {});
  return run;
}

let targetWindow: BrowserWindow | null = null;
const jobs: QueueJob[] = [];
const activeChildren = new Map<string, ChildProcessWithoutNullStreams>();
const pendingClaimed = new Set<string>();
let pumpBusy = false;

export function setQueueWindow(win: BrowserWindow | null): void {
  targetWindow = win;
}

function sortedJobs(): QueueJob[] {
  return [...jobs].sort((a, b) => {
    const tier = (j: QueueJob): number => {
      if (j.status === "downloading") return 0;
      if (j.status === "pending" || j.status === "paused") return 1;
      return 2;
    };
    const ta = tier(a);
    const tb = tier(b);
    if (ta !== tb) return ta - tb;
    if (ta <= 1) return a.createdAt - b.createdAt;
    return b.createdAt - a.createdAt;
  });
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
  const m2 = /\[download\]\s*Destination:\s*(.+)/i.exec(stderr);
  if (m2?.[1]) return m2[1].trim();
  const m3 = /\[ExtractAudio\]\s*Destination:\s*(.+)/i.exec(stderr);
  if (m3?.[1]) return m3[1].trim();
  const m4 = /\[Fixup\w*\].*"(.+?)"/.exec(stderr);
  if (m4?.[1]) return m4[1];
  const lines = stderr.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = (lines[i] ?? "").trim();
    const dm = /Destination:\s*(.+)$/i.exec(line);
    if (!dm?.[1]) continue;
    const p = dm[1].replace(/^["']|["']$/g, "").trim();
    if (!p) continue;
    if (/\.(mp4|mkv|webm|mp3|m4a|opus|aac|flac|wav|ogg)$/i.test(p)) {
      return p;
    }
  }
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

function parseFilepathFromYtdlpPrintOutput(stdout: string, stderr: string): string | null {
  const combined = `${stdout}\n${stderr}`;
  const lines = combined.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const tryLine = (line: string): string | null => {
    let t = line.trim();
    if (!t) return null;
    if (
      (t.startsWith('"') && t.endsWith('"')) ||
      (t.startsWith("'") && t.endsWith("'"))
    ) {
      t = t.slice(1, -1);
    }
    if (/^([A-Za-z]:[\\/]|\\\\)/.test(t) || (t.startsWith("/") && t.length > 2)) {
      if (/\.(mp4|mkv|webm|mp3|m4a|opus|aac|flac|wav|ogg)$/i.test(t)) {
        return normalize(t);
      }
    }
    return null;
  };
  for (let i = lines.length - 1; i >= 0; i--) {
    const p = tryLine(lines[i] ?? "");
    if (p) return p;
  }
  return null;
}

function isExpectedFilenameForDuplicateCheck(
  name: string,
  videoId: string,
  duplicateIndex: number | null | undefined,
): boolean {
  const esc = videoId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const ext = "(\\.[a-z0-9]+)$";
  if (duplicateIndex != null && duplicateIndex > 0) {
    return new RegExp(`\\[${esc}\\] \\(${duplicateIndex}\\)${ext}`, "i").test(name);
  }
  return new RegExp(`\\[${esc}\\]${ext}`, "i").test(name);
}

function findExistingOutputMatchingJob(job: QueueJob): string | null {
  const videoId = extractYoutubeVideoIdFromUrl(job.url);
  if (!videoId) return null;
  const slug = omniSlugForFilename(job);
  const prefix = `OmniDL_(${slug})_`;
  const needle = `[${videoId}]`;
  const dir = job.outputDir;
  try {
    if (!existsSync(dir) || !statSync(dir).isDirectory()) return null;
  } catch {
    return null;
  }
  const mediaExt = new Set([
    ".mp3",
    ".m4a",
    ".opus",
    ".aac",
    ".wav",
    ".ogg",
    ".flac",
    ".mp4",
    ".mkv",
    ".webm",
    ".mov",
  ]);
  try {
    const names = readdirSync(dir);
    const hits: string[] = [];
    for (const name of names) {
      if (!name.startsWith(prefix) || !name.includes(needle)) continue;
      const low = name.toLowerCase();
      const dot = low.lastIndexOf(".");
      if (dot < 0) continue;
      const ext = low.slice(dot);
      if (!mediaExt.has(ext)) continue;
      if (!isExpectedFilenameForDuplicateCheck(name, videoId, job.duplicateIndex)) continue;
      const full = join(dir, name);
      try {
        if (statSync(full).isFile()) hits.push(full);
      } catch {
        /* ignore */
      }
    }
    if (hits.length === 0) return null;
    hits.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
    return hits[0]!;
  } catch {
    return null;
  }
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
    const { stdout, stderr, code } = await runYtdlp(
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
    const parsed = parseFilepathFromYtdlpPrintOutput(stdout, stderr);
    if (parsed) return parsed;
    if (code !== 0) return null;
    return null;
  } catch {
    return null;
  }
}

async function resolveDuplicate(job: QueueJob): Promise<"proceed" | "skip" | "abort"> {
  let predicted = await predictOutputPath(job);
  let predictedExists = predicted != null && mediaFileExistsOnDisk(predicted);
  if (!predictedExists) {
    const scout = findExistingOutputMatchingJob(job);
    if (scout != null && mediaFileExistsOnDisk(scout)) {
      predicted = scout;
      predictedExists = true;
    }
  }
  if (!predictedExists) return "proceed";

  if (!targetWindow || targetWindow.isDestroyed()) {
    return "abort";
  }

  const choice = await new Promise<DuplicateChoice>((resolve) => {
    pendingDuplicate = { jobId: job.id, resolve };
    targetWindow!.webContents.send("duplicate:ask", {
      jobId: job.id,
      predictedPath: predicted ?? "",
    });
  });

  if (choice === "cancel") return "abort";
  if (choice === "open") {
    if (predicted) {
      revealPathInExplorer(predicted);
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
  if (job.status !== "pending") return;
  if (pendingClaimed.has(job.id)) return;
  pendingClaimed.add(job.id);
  try {
    const dup = await withDuplicateLock(() => resolveDuplicate(job));
    if (!jobs.includes(job)) return;
    if (dup === "abort") {
      job.status = "error";
      job.error = "Cancelled";
      removeJobFromQueue(job);
      pushState();
      return;
    }
    if (dup === "skip") {
      removeJobFromQueue(job);
      pushState();
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
    activeChildren.set(job.id, child);
    try {
      const { code, stderr } = await promise;
      if (!jobs.includes(job)) {
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
      const rawOut = findOutputPath(stderr);
      let finalOut: string | undefined;
      if (rawOut) {
        finalOut = resolveExistingMediaPath(rawOut) ?? undefined;
        if (!finalOut && existsSync(rawOut)) {
          finalOut = rawOut;
        }
      }
      if (finalOut) {
        job.outputPath = finalOut;
        cleanupYtdlpSidecars(finalOut);
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
      const T = getNotifyBatchThreshold();
      const remainingActive = jobs.filter(
        (j) => j.status === "pending" || j.status === "downloading" || j.status === "paused",
      ).length;
      const totalJobs = jobs.length;
      if (T > 0 && totalJobs > T) {
        if (remainingActive > 0) {
          completionBatchCount++;
          if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send("download:batchPeek", { title: job.title });
          }
        } else {
          completionBatchCount++;
          const cnt = completionBatchCount;
          completionBatchCount = 0;
          if (shouldShowOsPush() && Notification.isSupported()) {
            new Notification({
              title: "Downloads complete",
              body: `${cnt} item(s) finished`,
            }).show();
          }
          if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send("download:batchDone", {
              count: cnt,
              outputDir: job.outputDir,
            });
          }
        }
      } else {
        if (shouldShowOsPush() && Notification.isSupported()) {
          new Notification({ title: "Download complete", body: job.title }).show();
        }
        if (targetWindow && !targetWindow.isDestroyed()) {
          targetWindow.webContents.send("download:done", {
            title: job.title,
            path: job.outputPath ?? job.outputDir,
          });
        }
      }
      pushState();
    } finally {
      activeChildren.delete(job.id);
    }
  } finally {
    pendingClaimed.delete(job.id);
    void pump();
  }
}

async function pump(): Promise<void> {
  if (pumpBusy) return;
  const max = getMaxConcurrency();
  const running = jobs.filter((j) => j.status === "downloading").length;
  const slots = max - running;
  if (slots <= 0) return;
  pumpBusy = true;
  try {
    for (let i = 0; i < slots; i++) {
      const next = jobs.find((j) => j.status === "pending" && !pendingClaimed.has(j.id));
      if (!next) break;
      void runJob(next);
    }
  } finally {
    pumpBusy = false;
  }
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
    url: normalizeVideoUrl(payload.url.trim()),
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
  const max = getMaxConcurrency();
  const running = jobs.filter((j) => j.status === "downloading").length;
  if (payload.mode === "next") {
    const di = jobs.findIndex((j) => j.status === "downloading");
    if (di >= 0) jobs.splice(di + 1, 0, job);
    else jobs.push(job);
  } else {
    jobs.push(job);
  }
  pushState();
  if (running < max) {
    void pump();
  }
  return job;
}

export function pauseJob(id: string): void {
  const job = jobs.find((j) => j.id === id);
  if (!job || job.status !== "downloading") return;
  job.status = "paused";
  activeChildren.get(id)?.kill();
  activeChildren.delete(id);
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
    activeChildren.get(id)?.kill();
    activeChildren.delete(id);
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
    activeChildren.get(id)?.kill();
    activeChildren.delete(id);
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
