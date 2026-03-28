import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { chmodSync, createWriteStream, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import ffmpegStatic from "ffmpeg-static";

let ytdlpPathCache = "";
let binDirCache = "";

export function setBinDir(userData: string): void {
  binDirCache = join(userData, "bin");
  mkdirSync(binDirCache, { recursive: true });
  ytdlpPathCache = join(binDirCache, process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");
}

export function getYtdlpPath(): string {
  return ytdlpPathCache;
}

export function getFfmpegLocation(): string | undefined {
  if (!ffmpegStatic) return undefined;
  return dirname(ffmpegStatic);
}

function ytdlpArgs(base: string[]): string[] {
  const out = [...base];
  if (ffmpegStatic) {
    out.push("--ffmpeg-location", ffmpegStatic);
  }
  if (process.platform === "win32") {
    out.push("--windows-filenames");
  }
  return out;
}

async function downloadToFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching binary`);
  const buf = Buffer.from(await res.arrayBuffer());
  await new Promise<void>((resolve, reject) => {
    const ws = createWriteStream(dest);
    ws.on("error", reject);
    ws.on("finish", () => resolve());
    ws.end(buf);
  });
}

export async function getLatestYtdlpTag(): Promise<string> {
  const res = await fetch("https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest", {
    headers: { "User-Agent": "OmniDL" },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const j = (await res.json()) as { tag_name?: string };
  return j.tag_name ?? "";
}

export async function getLocalYtdlpVersion(): Promise<string | null> {
  if (!existsSync(getYtdlpPath())) return null;
  try {
    const { stdout } = await runYtdlp(["--version"], { maxBuffer: 2 * 1024 * 1024 });
    return stdout.trim().split("\n")[0] ?? null;
  } catch {
    return null;
  }
}

function normVer(s: string): string {
  return s.trim().replace(/^v/i, "");
}

export async function ensureYtdlp(onLog?: (line: string) => void): Promise<void> {
  if (!binDirCache) throw new Error("Bin dir not set");
  const local = await getLocalYtdlpVersion();
  let remote = "";
  try {
    remote = await getLatestYtdlpTag();
  } catch {
    onLog?.("Could not check remote yt-dlp version");
  }
  if (local && remote && normVer(local).startsWith(normVer(remote))) {
    onLog?.(`yt-dlp ${local} OK`);
    return;
  }
  if (local && !remote) {
    onLog?.(`yt-dlp ${local} (offline)`);
    return;
  }
  const url =
    process.platform === "win32"
      ? "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
      : process.platform === "darwin"
        ? "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos"
        : "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";
  onLog?.("Downloading yt-dlp…");
  await downloadToFile(url, getYtdlpPath());
  if (process.platform !== "win32") {
    try {
      chmodSync(getYtdlpPath(), 0o755);
    } catch {
      /* ignore */
    }
  }
  onLog?.("yt-dlp ready");
}

export async function runYtdlp(
  args: string[],
  options: { maxBuffer?: number; signal?: AbortSignal } = {},
): Promise<{ stdout: string; stderr: string; code: number }> {
  const maxBuffer = options.maxBuffer ?? 100 * 1024 * 1024;
  const full = ytdlpArgs(args);
  return new Promise((resolve, reject) => {
    if (!existsSync(getYtdlpPath())) {
      reject(new Error("yt-dlp not installed"));
      return;
    }
    const child = spawn(getYtdlpPath(), full, {
      windowsHide: true,
      signal: options.signal,
    });
    let stdout = "";
    let stderr = "";
    let killed = false;
    child.stdout?.on("data", (d: Buffer) => {
      if (stdout.length < maxBuffer) stdout += d.toString();
    });
    child.stderr?.on("data", (d: Buffer) => {
      if (stderr.length < maxBuffer) stderr += d.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (killed) return;
      resolve({ stdout, stderr, code: code ?? 0 });
    });
    options.signal?.addEventListener("abort", () => {
      killed = true;
      child.kill();
    });
  });
}

export interface DownloadProgress {
  percent: number;
  speed?: string;
  eta?: string;
  line: string;
}

function parseProgressLine(line: string): DownloadProgress | null {
  if (!line.includes("[download]")) return null;
  const pct = /(\d+(?:\.\d+)?)\s*%/.exec(line);
  const speed = /at\s+([^\s]+\/s)/.exec(line);
  const eta = /ETA\s+(\d+:\d+)/.exec(line);
  if (!pct) return null;
  return {
    percent: Math.min(100, parseFloat(pct[1])),
    speed: speed?.[1],
    eta: eta?.[1],
    line: line.trim(),
  };
}

export function runYtdlpDownload(
  args: string[],
  handlers: {
    onStdout?: (s: string) => void;
    onStderr?: (s: string) => void;
    onProgress?: (p: DownloadProgress) => void;
  },
): { child: ChildProcessWithoutNullStreams; promise: Promise<{ code: number; stderr: string }> } {
  const full = ytdlpArgs(args);
  const child = spawn(getYtdlpPath(), full, { windowsHide: true }) as ChildProcessWithoutNullStreams;
  let combined = "";
  const feed = (chunk: Buffer) => {
    const s = chunk.toString();
    combined += s;
    const lines = s.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      const prog = parseProgressLine(line);
      if (prog) handlers.onProgress?.(prog);
      else handlers.onStderr?.(line);
    }
  };
  child.stdout?.on("data", (d: Buffer) => feed(d));
  child.stderr?.on("data", (d: Buffer) => feed(d));
  const promise = new Promise<{ code: number; stderr: string }>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 0, stderr: combined }));
  });
  return { child, promise };
}
