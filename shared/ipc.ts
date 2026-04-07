export type TabId =
  | "home"
  | "search"
  | "queue"
  | "playlist"
  | "history"
  | "options"
  | "instruction";

export interface YoutubeSearchResult {
  title: string;
  url: string;
  thumbnail: string | null;
  duration: number | null;
  viewCount: number | null;
  uploader: string | null;
  channel: string | null;
  description: string | null;
}

export type DuplicateChoice = "redownload" | "open" | "cancel";

export interface DuplicateAskPayload {
  jobId: string;
  predictedPath: string;
  historyHit: boolean;
  fileExists: boolean;
}

export type JobStatus =
  | "pending"
  | "downloading"
  | "paused"
  | "completed"
  | "error"
  | "cancelled";

export type DownloadKind = "video" | "audio";

export interface QueueJob {
  id: string;
  url: string;
  title: string;
  formatLabel: string;
  formatSelector: string;
  outputDir: string;
  outputTemplate: string;
  kind: DownloadKind;
  platform?: string;
  thumbnailUrl?: string;
  duplicateIndex?: number | null;
  createdAt: number;
  status: JobStatus;
  progress: number;
  speed?: string;
  eta?: string;
  error?: string;
  outputPath?: string;
}

export interface QueueState {
  activeId: string | null;
  jobs: QueueJob[];
}

export interface VideoMetaDisplay {
  id: string;
  title: string;
  thumbnail: string | null;
  duration: number | null;
  viewCount: number | null;
  uploadDate: string | null;
  uploader: string | null;
  webpageUrl: string;
  platform: "youtube" | "tiktok" | "facebook" | "unknown";
}

export interface FormatOption {
  id: string;
  label: string;
  formatSelector: string;
  estimatedBytes: number | null;
  isEstimate: boolean;
}

export interface VideoInfoPayload {
  meta: VideoMetaDisplay;
  options: FormatOption[];
}

export interface PlaylistEntry {
  index: number;
  id: string;
  title: string;
  url: string;
  thumbnail: string | null;
  duration: number | null;
}

export interface PlaylistInfoPayload {
  title: string;
  entries: PlaylistEntry[];
}

export interface HistoryRow {
  id: string;
  url: string;
  title: string;
  platform: string;
  mediaPath: string;
  quality: string;
  kind: DownloadKind;
  createdAt: number;
  exists: boolean;
  thumbnailPath: string | null;
}
