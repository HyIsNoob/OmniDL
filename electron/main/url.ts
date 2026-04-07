export function normalizeVideoUrl(input: string): string {
  const raw = input.trim();
  if (!raw) return raw;
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      return `https://www.youtube.com/watch?v=${u.pathname.replace(/^\//, "")}`;
    }
    if (host.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) {
        return `https://www.youtube.com/watch?v=${v}`;
      }
      if (u.pathname.startsWith("/shorts/")) {
        return u.toString();
      }
    }
    return u.toString();
  } catch {
    return raw;
  }
}

export function looksLikeYtOrTiktok(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    t.includes("youtube.com") ||
    t.includes("youtu.be") ||
    t.includes("tiktok.com") ||
    t.includes("vm.tiktok.com") ||
    t.includes("facebook.com") ||
    t.includes("m.facebook.com") ||
    t.includes("fb.watch") ||
    t.includes("fb.com/")
  );
}

export function extractYoutubeVideoIdFromUrl(url: string): string | null {
  const raw = url.trim();
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const seg = u.pathname.replace(/^\//, "").split("/")[0] ?? "";
      return /^[\w-]{11}$/.test(seg) ? seg : null;
    }
    if (host.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const shorts = /\/shorts\/([\w-]+)/.exec(u.pathname);
      if (shorts?.[1] && /^[\w-]{11}$/.test(shorts[1])) return shorts[1];
      const live = /\/live\/([\w-]+)/.exec(u.pathname);
      if (live?.[1] && /^[\w-]{11}$/.test(live[1])) return live[1];
    }
    return null;
  } catch {
    return null;
  }
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
