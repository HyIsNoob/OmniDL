export function sanitizeFileNameSegment(name: string, maxLen: number): string {
  const noCtrl = [...name]
    .map((ch) => {
      const code = ch.charCodeAt(0);
      return code < 32 ? "_" : ch;
    })
    .join("");
  const base = noCtrl.replace(/[<>:"/\\|?*]/g, "_").trim() || "thumb";
  return base.slice(0, maxLen);
}
