import type { FormatOption, VideoInfoPayload, VideoMetaDisplay } from "../../shared/ipc.js";

interface RawFormat {
  format_id: string;
  format_note?: string;
  height?: number;
  width?: number;
  vcodec?: string;
  acodec?: string;
  filesize?: number;
  filesize_approx?: number;
  tbr?: number;
  abr?: number;
  vbr?: number;
  fps?: number;
}

interface RawInfo {
  id: string;
  title: string;
  thumbnail?: string;
  thumbnails?: Array<{ url: string; height?: number }>;
  duration?: number;
  view_count?: number;
  upload_date?: string;
  uploader?: string;
  webpage_url: string;
  extractor?: string;
  formats?: RawFormat[];
}

const TIERS = [2160, 1440, 1080, 720, 480, 360, 144] as const;

function pickThumb(info: RawInfo): string | null {
  if (info.thumbnail) return info.thumbnail;
  const t = info.thumbnails;
  if (t?.length) {
    const sorted = [...t].sort((a, b) => (b.height ?? 0) - (a.height ?? 0));
    return sorted[0]?.url ?? null;
  }
  return null;
}

function platformFrom(info: RawInfo): VideoMetaDisplay["platform"] {
  const e = (info.extractor ?? "").toLowerCase();
  if (e.includes("youtube")) return "youtube";
  if (e.includes("tiktok")) return "tiktok";
  if (e.includes("facebook")) return "facebook";
  return "unknown";
}

function videoTracksForEstimate(formats: RawFormat[]): RawFormat[] {
  const dashVideo = formats.filter(
    (f) =>
      f.vcodec &&
      f.vcodec !== "none" &&
      f.height &&
      (!f.acodec || f.acodec === "none"),
  );
  if (dashVideo.length) return dashVideo;
  return formats.filter((f) => f.vcodec && f.vcodec !== "none" && f.height);
}

function audioTracksForEstimate(formats: RawFormat[]): RawFormat[] {
  const onlyA = formats.filter(
    (f) => f.acodec && f.acodec !== "none" && (!f.vcodec || f.vcodec === "none"),
  );
  if (onlyA.length) return onlyA;
  return formats.filter((f) => f.acodec && f.acodec !== "none");
}

function bytesFromBitrateKbps(br: number | undefined, duration: number): number | null {
  if (br == null || br <= 0 || !Number.isFinite(br)) return null;
  return Math.round((br * 1000 * duration) / 8);
}

function pickVideoStreamBytes(f: RawFormat, duration: number): number | null {
  const br = f.vbr ?? f.tbr;
  const fromBitrate = bytesFromBitrateKbps(br, duration);
  const fromSize = f.filesize_approx ?? f.filesize ?? null;
  if (fromBitrate != null && fromSize != null && fromSize > 0) {
    if (fromSize < fromBitrate * 0.25) return fromBitrate;
    return Math.max(fromSize, fromBitrate);
  }
  if (fromBitrate != null) return fromBitrate;
  if (fromSize != null && fromSize > 0) return fromSize;
  return null;
}

function pickAudioStreamBytes(f: RawFormat, duration: number): number | null {
  const br = f.abr ?? f.tbr;
  const fromBitrate = bytesFromBitrateKbps(br, duration);
  const fromSize = f.filesize_approx ?? f.filesize ?? null;
  if (fromBitrate != null && fromSize != null && fromSize > 0) {
    if (fromSize < fromBitrate * 0.25) return fromBitrate;
    return Math.max(fromSize, fromBitrate);
  }
  if (fromBitrate != null) return fromBitrate;
  if (fromSize != null && fromSize > 0) return fromSize;
  return null;
}

const MERGE_SIZE_BUFFER = 1.12;
const BEST_AUDIO_BUFFER = 1.1;

function sortVideoTracksByHeightThenSize(
  vids: RawFormat[],
  duration: number,
): RawFormat[] {
  return [...vids].sort((a, b) => {
    const dh = (b.height ?? 0) - (a.height ?? 0);
    if (dh !== 0) return dh;
    const sa = pickVideoStreamBytes(a, duration) ?? 0;
    const sb = pickVideoStreamBytes(b, duration) ?? 0;
    return sb - sa;
  });
}

function sortAudioTracksByAbrThenSize(
  tracks: RawFormat[],
  duration: number,
): RawFormat[] {
  return [...tracks].sort((a, b) => {
    const da = (b.abr ?? 0) - (a.abr ?? 0);
    if (da !== 0) return da;
    const sa = pickAudioStreamBytes(a, duration) ?? 0;
    const sb = pickAudioStreamBytes(b, duration) ?? 0;
    return sb - sa;
  });
}

function estimateBytes(
  duration: number | null | undefined,
  formats: RawFormat[] | undefined,
  selector: string,
): { bytes: number | null; isEstimate: boolean } {
  if (!duration || duration <= 0 || !formats?.length) {
    return { bytes: null, isEstimate: true };
  }
  const audioOnly =
    /^ba\b/i.test(selector) ||
    selector === "ba/b" ||
    (selector.includes("bestaudio") && !selector.includes("bestvideo"));
  if (audioOnly) {
    const abrCapMatch = /abr<=(\d+)/.exec(selector);
    const abrCap = abrCapMatch ? Number(abrCapMatch[1]) : undefined;
    let pool = sortAudioTracksByAbrThenSize(audioTracksForEstimate(formats), duration);
    if (abrCap != null && !Number.isNaN(abrCap)) {
      const under = pool.filter((f) => (f.abr ?? 0) > 0 && (f.abr ?? 0) <= abrCap);
      if (under.length) pool = under;
      else {
        const capBytes = bytesFromBitrateKbps(abrCap, duration);
        if (capBytes != null) {
          return { bytes: capBytes, isEstimate: true };
        }
      }
    }
    const audPick = pool[0];
    if (!audPick) return { bytes: null, isEstimate: true };
    const b = pickAudioStreamBytes(audPick, duration);
    if (b == null) return { bytes: null, isEstimate: true };
    const isPureBestAudio = /^bestaudio\/best$/i.test(selector.trim());
    const bytesOut = isPureBestAudio ? Math.round(b * BEST_AUDIO_BUFFER) : b;
    return {
      bytes: bytesOut,
      isEstimate: audPick.filesize == null && audPick.filesize_approx == null,
    };
  }
  let best: RawFormat | undefined;
  const hMatch = /height<=(\d+)/.exec(selector);
  const cap = hMatch ? Number(hMatch[1]) : undefined;
  const vids = videoTracksForEstimate(formats);
  if (cap != null && !Number.isNaN(cap)) {
    const pool = vids.filter((f) => (f.height ?? 0) <= cap);
    best = sortVideoTracksByHeightThenSize(pool, duration)[0];
  } else {
    best = sortVideoTracksByHeightThenSize(vids, duration)[0];
  }
  const aud = sortAudioTracksByAbrThenSize(audioTracksForEstimate(formats), duration)[0];
  let total = 0;
  let has = false;
  if (best) {
    const vb = pickVideoStreamBytes(best, duration);
    if (vb != null) {
      total += vb;
      has = true;
    }
  }
  if (!audioOnly && (selector.includes("+ba") || selector.includes("+bestaudio"))) {
    if (aud) {
      const ab = pickAudioStreamBytes(aud, duration);
      if (ab != null) {
        total += ab;
        has = true;
      }
    }
  }
  if (!has) {
    return { bytes: null, isEstimate: true };
  }
  const merged =
    !audioOnly &&
    (selector.includes("+ba") || selector.includes("+bestaudio")) &&
    best &&
    aud;
  const bytesOut = merged ? Math.round(total * MERGE_SIZE_BUFFER) : Math.round(total);
  return {
    bytes: bytesOut,
    isEstimate: true,
  };
}

export function buildVideoPayload(jsonText: string): VideoInfoPayload {
  const info = JSON.parse(jsonText) as RawInfo;
  const formats = info.formats ?? [];
  const duration = info.duration ?? null;
  const vids = videoTracksForEstimate(formats);
  const maxHeight = vids.length ? Math.max(...vids.map((f) => f.height ?? 0)) : 0;

  const meta: VideoMetaDisplay = {
    id: info.id,
    title: info.title,
    thumbnail: pickThumb(info),
    duration,
    viewCount: info.view_count ?? null,
    uploadDate: info.upload_date ?? null,
    uploader: info.uploader ?? null,
    webpageUrl: info.webpage_url,
    platform: platformFrom(info),
  };

  const options: FormatOption[] = [];

  const bestVidSel = "bv*+ba/b";
  const bestVidEst = estimateBytes(duration, formats, bestVidSel);
  options.push({
    id: "best-video",
    label: "Best video",
    formatSelector: bestVidSel,
    estimatedBytes: bestVidEst.bytes,
    isEstimate: bestVidEst.isEstimate,
  });

  for (const t of TIERS) {
    if (maxHeight < t) continue;
    const sel = `bv*[height<=${t}]+ba/b[height<=${t}]`;
    const est = estimateBytes(duration, formats, sel);
    const label =
      t === 1440 ? "2K (1440p)" : t === 2160 ? "4K (2160p)" : `${t}p`;
    options.push({
      id: `res-${t}`,
      label,
      formatSelector: sel,
      estimatedBytes: est.bytes,
      isEstimate: est.isEstimate,
    });
  }

  const bestAudSel = "bestaudio/best";
  const bestAudEst = estimateBytes(duration, formats, bestAudSel);
  options.push({
    id: "best-audio",
    label: "Best audio",
    formatSelector: bestAudSel,
    estimatedBytes: bestAudEst.bytes,
    isEstimate: bestAudEst.isEstimate,
  });

  const sel128 = "bestaudio[abr<=128]/bestaudio/worstaudio/best";
  const est128 = estimateBytes(duration, formats, sel128);
  options.push({
    id: "audio-128",
    label: "Audio ~128 kbps",
    formatSelector: sel128,
    estimatedBytes: est128.bytes,
    isEstimate: est128.isEstimate,
  });

  const sel320 = "bestaudio[abr<=320]/bestaudio/best";
  const est320 = estimateBytes(duration, formats, sel320);
  options.push({
    id: "audio-320",
    label: "Audio ~320 kbps",
    formatSelector: sel320,
    estimatedBytes: est320.bytes,
    isEstimate: est320.isEstimate,
  });

  return { meta, options };
}

export function thumbnailFromVideoJson(jsonText: string): string | null {
  try {
    const info = JSON.parse(jsonText) as RawInfo;
    return pickThumb(info);
  } catch {
    return null;
  }
}

export function buildPlaylistPayload(jsonText: string): {
  title: string;
  entries: Array<{
    index: number;
    id: string;
    title: string;
    url: string;
    thumbnail: string | null;
    duration: number | null;
  }>;
} {
  const data = JSON.parse(jsonText) as {
    title?: string;
    entries?: Array<{
      id: string;
      title: string;
      url: string;
      thumbnails?: Array<{ url: string }>;
      duration?: number;
    }>;
  };
  const title = data.title ?? "Playlist";
  const entries = (data.entries ?? []).map((e, i) => {
    const id = String(e.id ?? "");
    const vidUrl =
      e.url ||
      (id ? `https://www.youtube.com/watch?v=${encodeURIComponent(id)}` : "");
    return {
      index: i + 1,
      id,
      title: e.title ?? "(no title)",
      url: vidUrl,
      thumbnail: e.thumbnails?.[0]?.url ?? null,
      duration: e.duration ?? null,
    };
  });
  return { title, entries };
}

function pickBestThumbnail(thumbs: Array<{ url: string }> | undefined): string | null {
  if (!thumbs?.length) return null;
  const last = thumbs[thumbs.length - 1];
  return last?.url ?? thumbs[0]?.url ?? null;
}

export function buildSearchResults(jsonText: string): Array<{
  title: string;
  url: string;
  thumbnail: string | null;
  duration: number | null;
  viewCount: number | null;
  uploader: string | null;
  channel: string | null;
  description: string | null;
}> {
  const data = JSON.parse(jsonText) as {
    entries?: Array<{
      id?: string;
      title?: string;
      url?: string;
      webpage_url?: string;
      duration?: number;
      view_count?: number;
      uploader?: string;
      channel?: string;
      description?: string;
      thumbnails?: Array<{ url: string }>;
    }>;
  };
  const out: Array<{
    title: string;
    url: string;
    thumbnail: string | null;
    duration: number | null;
    viewCount: number | null;
    uploader: string | null;
    channel: string | null;
    description: string | null;
  }> = [];
  for (const e of data.entries ?? []) {
    const id = String(e.id ?? "");
    const url =
      e.webpage_url ||
      e.url ||
      (id ? `https://www.youtube.com/watch?v=${encodeURIComponent(id)}` : "");
    if (!url.startsWith("http")) continue;
    const desc =
      typeof e.description === "string" && e.description.length > 0
        ? e.description.length > 320
          ? `${e.description.slice(0, 317)}…`
          : e.description
        : null;
    out.push({
      title: e.title ?? "(no title)",
      url,
      thumbnail: pickBestThumbnail(e.thumbnails),
      duration: typeof e.duration === "number" && e.duration > 0 ? e.duration : null,
      viewCount: typeof e.view_count === "number" ? e.view_count : null,
      uploader: e.uploader ?? null,
      channel: e.channel ?? e.uploader ?? null,
      description: desc,
    });
  }
  return out;
}
