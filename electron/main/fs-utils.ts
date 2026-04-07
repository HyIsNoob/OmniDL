import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, normalize, toNamespacedPath } from "node:path";
import { shell } from "electron";

function addPathVariants(set: Set<string>, p: string): void {
  const t = p.trim();
  if (!t) return;
  set.add(t);
  set.add(normalize(t));
  try {
    set.add(t.normalize("NFC"));
    set.add(t.normalize("NFD"));
  } catch {
    /* ignore */
  }
  if (process.platform === "win32") {
    try {
      const n = normalize(t);
      if (n.length >= 2 && n[1] === ":") {
        const ns = toNamespacedPath(n);
        if (ns) set.add(ns);
      }
    } catch {
      /* ignore */
    }
  }
}

function pathCandidates(p: string): string[] {
  const set = new Set<string>();
  addPathVariants(set, String(p ?? ""));
  return [...set].filter(Boolean);
}

function tryFileExists(p: string): string | null {
  for (const c of pathCandidates(p)) {
    try {
      if (existsSync(c) && statSync(c).isFile()) return c;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function tryDirectoryExists(p: string): string | null {
  for (const c of pathCandidates(p)) {
    try {
      if (existsSync(c) && statSync(c).isDirectory()) return c;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function extractIdAndExtFromFilename(base: string): { id: string; ext: string } | null {
  const extMatch = base.match(/(\.[^.]+)$/);
  if (!extMatch) return null;
  const ext = extMatch[1];
  const withoutExt = base.slice(0, -ext.length);
  const dupSuffix = / \(\d+\)$/.exec(withoutExt);
  const core = dupSuffix ? withoutExt.slice(0, dupSuffix.index) : withoutExt;
  const lastOpen = core.lastIndexOf("[");
  if (lastOpen < 0) return null;
  const lastClose = core.indexOf("]", lastOpen);
  if (lastClose <= lastOpen) return null;
  const id = core.slice(lastOpen + 1, lastClose).trim();
  if (!id || /[\r\n/\\]/.test(id)) return null;
  return { id, ext };
}

function tryFindByStableId(storedPath: string): string | null {
  const base = basename(storedPath);
  const parsed = extractIdAndExtFromFilename(base);
  if (!parsed) return null;
  const { id, ext } = parsed;
  let dir: string;
  try {
    dir = dirname(storedPath);
  } catch {
    return null;
  }
  const dirCandidates = pathCandidates(dir).filter((d) => {
    try {
      return existsSync(d) && statSync(d).isDirectory();
    } catch {
      return false;
    }
  });
  if (dirCandidates.length === 0) return null;
  const needle = `[${id}]`;
  const matches: string[] = [];
  for (const d of dirCandidates) {
    let names: string[];
    try {
      names = readdirSync(d);
    } catch {
      continue;
    }
    for (const n of names) {
      if (!n.includes(needle) || !n.endsWith(ext)) continue;
      const full = join(d, n);
      try {
        if (statSync(full).isFile()) matches.push(full);
      } catch {
        /* ignore */
      }
    }
  }
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0]!;
  const baseNfc = base.normalize("NFC");
  for (const full of matches) {
    if (basename(full) === base) return full;
  }
  for (const full of matches) {
    if (basename(full).normalize("NFC") === baseNfc) return full;
  }
  let best = matches[0]!;
  let bestMs = statSync(best).mtimeMs;
  for (const full of matches.slice(1)) {
    try {
      const ms = statSync(full).mtimeMs;
      if (ms > bestMs) {
        best = full;
        bestMs = ms;
      }
    } catch {
      /* ignore */
    }
  }
  return best;
}

export function mediaFileExistsOnDisk(p: string): boolean {
  return tryFileExists(p) != null || tryFindByStableId(p) != null;
}

export function resolveExistingMediaPath(p: string): string | null {
  const direct = tryFileExists(p);
  if (direct) return direct;
  const byId = tryFindByStableId(p);
  if (byId) return byId;
  const dirOnly = tryDirectoryExists(p);
  if (dirOnly) return dirOnly;
  return null;
}

export function revealPathInExplorer(p: string): void {
  const resolved = resolveExistingMediaPath(String(p ?? "").trim());
  const raw = normalize(resolved ?? String(p ?? "").trim());
  if (!raw) return;
  try {
    if (existsSync(raw)) {
      const st = statSync(raw);
      if (st.isFile()) {
        shell.showItemInFolder(raw);
        return;
      }
      if (st.isDirectory()) {
        void shell.openPath(raw);
        return;
      }
    }
    const parent = dirname(raw);
    if (parent !== raw && existsSync(parent)) {
      void shell.openPath(parent);
    }
  } catch {
    /* ignore */
  }
}
