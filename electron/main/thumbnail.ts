import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export function sanitizeThumbFileName(name: string): string {
  const base = name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").trim() || "thumb";
  return base.slice(0, 180);
}

export async function downloadThumbnail(url: string, destPath: string): Promise<boolean> {
  if (!url.startsWith("http")) return false;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 64) return false;
    mkdirSync(dirname(destPath), { recursive: true });
    writeFileSync(destPath, buf);
    return true;
  } catch {
    return false;
  }
}
