export function formatYtdlpUserMessage(stderr: string, code: number): string {
  const raw = (stderr || "").trim();
  if (looksLikeCookieOrRestricted(raw)) {
    return "Không thể tải video này (có thể cần đăng nhập/cookie hoặc nội dung bị giới hạn).";
  }
  if (raw.length > 800) return `${raw.slice(0, 800)}…`;
  return raw || `yt-dlp failed (${code})`;
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
