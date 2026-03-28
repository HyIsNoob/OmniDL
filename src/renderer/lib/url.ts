export function looksLikeYtOrTiktok(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    t.includes("youtube.com") ||
    t.includes("youtu.be") ||
    t.includes("tiktok.com") ||
    t.includes("vm.tiktok.com")
  );
}

export function extractFirstYtOrTiktokUrlAny(text: string): string | null {
  const raw = text.trim();
  if (!raw) return null;
  const urlRe = /https?:\/\/[^\s<>"']+/gi;
  const candidates: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(raw)) !== null) {
    let c = m[0];
    c = c.replace(/[),.;:!?\]]+$/g, "");
    if (!candidates.includes(c)) candidates.push(c);
  }
  for (const c of candidates) {
    if (looksLikeYtOrTiktok(c)) {
      return c;
    }
  }
  return null;
}

export function extractFirstYtOrTiktokVideoUrl(text: string): string | null {
  const raw = text.trim();
  if (!raw) return null;
  const urlRe = /https?:\/\/[^\s<>"']+/gi;
  const candidates: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(raw)) !== null) {
    let c = m[0];
    c = c.replace(/[),.;:!?\]]+$/g, "");
    if (!candidates.includes(c)) candidates.push(c);
  }
  for (const c of candidates) {
    if (looksLikeYtOrTiktok(c) && !looksLikeYoutubePlaylistOnlyUrl(c)) {
      return c;
    }
  }
  return null;
}

export function looksLikeYoutubePlaylistOnlyUrl(text: string): boolean {
  const raw = text.trim();
  if (!raw) return false;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "youtu.be") {
    return false;
  }
  if (!host.includes("youtube.com")) {
    return false;
  }
  if (u.searchParams.has("v")) {
    return false;
  }
  const path = u.pathname.toLowerCase();
  if (path.includes("/shorts/")) {
    return false;
  }
  if (path.includes("/playlist")) {
    return true;
  }
  return u.searchParams.has("list");
}
