export function formatYtdlpUserMessage(stderr: string, code: number): string {
  const raw = (stderr || "").trim();
  if (looksLikeNetworkError(raw)) {
    return "Network error: check your connection, then try again.";
  }
  if (looksLikeCookieOrRestricted(raw)) {
    return "This source may need sign-in or cookies. Wait a moment and try Fetch / download again.";
  }
  if (!raw) return `yt-dlp failed (${code}). Try again if this was temporary.`;
  if (raw.length > 320) return `${raw.slice(0, 320)}… Try again if this was temporary.`;
  return `${raw} Try again if this was temporary.`;
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
    /login|logged in|login required|sign in|authentication|registered users|private video|age-restricted|only available when|requires you to be|need to be logged|you need to log/.test(
      s,
    )
  );
}
