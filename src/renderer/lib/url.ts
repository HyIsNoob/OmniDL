export function looksLikeYtOrTiktok(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    t.includes("youtube.com") ||
    t.includes("youtu.be") ||
    t.includes("tiktok.com") ||
    t.includes("vm.tiktok.com")
  );
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
