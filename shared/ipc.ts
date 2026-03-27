export type TabId = "home" | "queue" | "playlist" | "history" | "options";

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
  platform: "youtube" | "tiktok" | "unknown";
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
