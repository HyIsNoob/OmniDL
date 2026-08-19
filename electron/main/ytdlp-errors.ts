export function formatYtdlpUserMessage(stderr: string, code: number): string {
  const raw = (stderr || "").trim();
  if (!raw) return `Download failed (exit code ${code}). Try again if this was temporary.`;

  if (looksLikeNetworkError(raw)) {
    return "Network error: check your connection, then try again.";
  }
  if (looksLikeCookieOrRestricted(raw)) {
    return "This video may need sign-in, cookies, or has anti-bot restrictions. Wait a moment and try again.";
  }
  if (looksLikeExtractorOrOutdated(raw)) {
    return "Extractor error: The video platform updated its format. Please update yt-dlp in Settings > Updates, then try again.";
  }
  if (looksLikeUnavailableOrPrivate(raw)) {
    return "This video is private, deleted, or unavailable in your region.";
  }
  if (looksLikeFormatUnavailable(raw)) {
    return "Selected format or resolution is not available for this video. Try choosing 'Best video' or another format.";
  }

  const post = postprocessorOrFfmpegLine(raw);
  if (post) return `${post} Try again if this was temporary.`;

  const errorLine = findBestErrorLine(raw);
  if (errorLine) return `${errorLine} Try again if this was temporary.`;

  const tail = getLastMeaningfulLines(raw, 2);
  if (tail) return `${tail} Try again if this was temporary.`;

  return `yt-dlp failed (${code}). Try again if this was temporary.`;
}

function findBestErrorLine(stderr: string): string | null {
  const lines = stderr.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const L = lines[i];
    if (/^ERROR:\s*/i.test(L) || /\[error\]/i.test(L)) {
      let cleaned = L.replace(/^ERROR:\s*/i, "").trim();
      cleaned = cleaned.replace(/;\s*please report this issue on\s+https?:\/\/[^\s]+/i, "");
      cleaned = cleaned.replace(/,\s*filling out the appropriate issue template\.?/i, "");
      cleaned = cleaned.replace(/Confirm you are on the latest version using\s+yt-dlp\s+-U\.?/i, "");
      cleaned = cleaned.trim();
      if (cleaned.length > 280) {
        cleaned = `${cleaned.slice(0, 280)}…`;
      }
      return cleaned || null;
    }
  }
  return null;
}

function getLastMeaningfulLines(stderr: string, count: number = 2): string | null {
  const lines = stderr
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("[download]") && !l.startsWith("[info]"));
  if (!lines.length) return null;
  const slice = lines.slice(-count);
  const text = slice.join(" — ");
  return text.length > 280 ? `${text.slice(0, 280)}…` : text;
}

function looksLikeExtractorOrOutdated(stderr: string): boolean {
  const s = stderr.toLowerCase();
  return (
    s.includes("unexpected response from webpage request") ||
    s.includes("unable to extract universal data") ||
    s.includes("unable to extract") ||
    s.includes("confirm you are on the latest version") ||
    s.includes("extractor error") ||
    s.includes("js player") ||
    s.includes("signature decipher")
  );
}

function looksLikeUnavailableOrPrivate(stderr: string): boolean {
  const s = stderr.toLowerCase();
  return (
    s.includes("video unavailable") ||
    s.includes("this video has been removed") ||
    s.includes("video has been deleted") ||
    s.includes("private video") ||
    s.includes("uploader has not made this video available in your country") ||
    s.includes("not available in your region") ||
    s.includes("copyright")
  );
}

function looksLikeFormatUnavailable(stderr: string): boolean {
  const s = stderr.toLowerCase();
  return s.includes("requested format is not available") || s.includes("no video formats found");
}

function postprocessorOrFfmpegLine(stderr: string): string | null {
  const lines = stderr.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const L = lines[i];
    if (
      /Post-?processor|ERROR:\s*ffmpeg|ffmpeg exited|Conversion failed|Could not find|not recognized as an internal or external command/i.test(
        L,
      ) ||
      (/ffmpeg/i.test(L) && /error|failed|invalid|cannot/i.test(L))
    ) {
      const clipped = L.length > 280 ? `${L.slice(0, 280)}…` : L;
      return clipped;
    }
  }
  return null;
}

function looksLikeNetworkError(stderr: string): boolean {
  const s = stderr.toLowerCase();
  return (
    /\beconnrefused\b|\beconnreset\b|\betimedout\b|\benotfound\b|getaddrinfo|network is unreachable|no route to host|connection refused|connection reset|unable to connect|failed to establish|temporary failure in name resolution|name or service not known|timed out|timeout\b|winerror 10054|winerror 10060|10054|10060|ssl: |certificate verify failed|nodename nor servname|offline\b/.test(
      s,
    ) || /http error 408/.test(s)
  );
}

function looksLikeCookieOrRestricted(stderr: string): boolean {
  const s = stderr.toLowerCase();
  return (
    /\bcookies?\b|cookies\.txt/.test(s) ||
    /login|logged in|login required|sign in|authentication|registered users|age-restricted|only available when|requires you to be|need to be logged|you need to log/.test(
      s,
    )
  );
}
