import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import initSqlJs, { type Database } from "sql.js";
import { fileURLToPath } from "node:url";
import { normalizeVideoUrl } from "./url.js";

let db: Database | null = null;
let dbPath = "";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

async function loadSqlWasm(): Promise<string | undefined> {
  try {
    const resolved = require.resolve("sql.js/dist/sql-wasm.wasm");
    if (existsSync(resolved)) return resolved;
  } catch {
    /* ignore */
  }
  const candidates = [
    join(__dirname, "../../node_modules/sql.js/dist/sql-wasm.wasm"),
    join(process.cwd(), "node_modules/sql.js/dist/sql-wasm.wasm"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return undefined;
}

export async function initDatabase(userData: string): Promise<void> {
  const wasm = await loadSqlWasm();
  const SQL = await initSqlJs({ locateFile: (f) => (wasm ? join(dirname(wasm), f) : f) });
  mkdirSync(userData, { recursive: true });
  dbPath = join(userData, "omnidl.db");
  if (existsSync(dbPath)) {
    const file = readFileSync(dbPath);
    db = new SQL.Database(file);
  } else {
    db = new SQL.Database();
  }
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      title TEXT,
      platform TEXT,
      media_path TEXT NOT NULL,
      quality TEXT,
      kind TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  try {
    db.run("ALTER TABLE history ADD COLUMN thumbnail_path TEXT");
  } catch {
    /* already migrated */
  }
  persist();
}

export function persist(): void {
  if (!db) return;
  const data = db.export();
  writeFileSync(dbPath, Buffer.from(data));
}

function getDb(): Database {
  if (!db) throw new Error("Database not initialized");
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    try {
      db.close();
    } catch {
      /* ignore */
    }
    db = null;
  }
}

export function settingsGet(key: string): string | null {
  const d = getDb();
  const stmt = d.prepare("SELECT value FROM settings WHERE key = ?");
  stmt.bind([key]);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const row = stmt.getAsObject() as { value: string };
  stmt.free();
  return row.value ?? null;
}

export function settingsSet(key: string, value: string): void {
  getDb().run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value]);
  persist();
}

export function historyList(): Array<{
  id: string;
  url: string;
  title: string;
  platform: string;
  mediaPath: string;
  quality: string;
  kind: string;
  createdAt: number;
  thumbnailPath: string | null;
}> {
  const d = getDb();
  const stmt = d.prepare(
    "SELECT id, url, title, platform, media_path, quality, kind, created_at, thumbnail_path FROM history ORDER BY created_at DESC",
  );
  const out: Array<{
    id: string;
    url: string;
    title: string;
    platform: string;
    mediaPath: string;
    quality: string;
    kind: string;
    createdAt: number;
    thumbnailPath: string | null;
  }> = [];
  while (stmt.step()) {
    const r = stmt.getAsObject() as Record<string, unknown>;
    out.push({
      id: String(r.id),
      url: String(r.url),
      title: String(r.title ?? ""),
      platform: String(r.platform ?? ""),
      mediaPath: String(r.media_path),
      quality: String(r.quality ?? ""),
      kind: String(r.kind),
      createdAt: Number(r.created_at),
      thumbnailPath: r.thumbnail_path != null ? String(r.thumbnail_path) : null,
    });
  }
  stmt.free();
  return out;
}

export function historyCount(): number {
  const stmt = getDb().prepare("SELECT COUNT(*) AS c FROM history");
  if (!stmt.step()) {
    stmt.free();
    return 0;
  }
  const r = stmt.getAsObject() as { c?: number };
  stmt.free();
  return Number(r.c ?? 0);
}

export function historyListPaged(
  offset: number,
  limit: number,
): Array<{
  id: string;
  url: string;
  title: string;
  platform: string;
  mediaPath: string;
  quality: string;
  kind: string;
  createdAt: number;
  thumbnailPath: string | null;
}> {
  const d = getDb();
  const lim = Math.min(500, Math.max(1, limit));
  const off = Math.max(0, offset);
  const stmt = d.prepare(
    "SELECT id, url, title, platform, media_path, quality, kind, created_at, thumbnail_path FROM history ORDER BY created_at DESC LIMIT ? OFFSET ?",
  );
  stmt.bind([lim, off]);
  const out: Array<{
    id: string;
    url: string;
    title: string;
    platform: string;
    mediaPath: string;
    quality: string;
    kind: string;
    createdAt: number;
    thumbnailPath: string | null;
  }> = [];
  while (stmt.step()) {
    const r = stmt.getAsObject() as Record<string, unknown>;
    out.push({
      id: String(r.id),
      url: String(r.url),
      title: String(r.title ?? ""),
      platform: String(r.platform ?? ""),
      mediaPath: String(r.media_path),
      quality: String(r.quality ?? ""),
      kind: String(r.kind),
      createdAt: Number(r.created_at),
      thumbnailPath: r.thumbnail_path != null ? String(r.thumbnail_path) : null,
    });
  }
  stmt.free();
  return out;
}

export function historyAdd(row: {
  id: string;
  url: string;
  title: string;
  platform: string;
  mediaPath: string;
  quality: string;
  kind: string;
  createdAt: number;
  thumbnailPath: string | null;
}): void {
  const urlNorm = normalizeVideoUrl(row.url);
  getDb().run(
    `INSERT OR REPLACE INTO history (id, url, title, platform, media_path, quality, kind, created_at, thumbnail_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      urlNorm,
      row.title,
      row.platform,
      row.mediaPath,
      row.quality,
      row.kind,
      row.createdAt,
      row.thumbnailPath,
    ],
  );
  persist();
}

export function historyRemove(id: string): void {
  getDb().run("DELETE FROM history WHERE id = ?", [id]);
  persist();
}

export function historyClear(): void {
  getDb().run("DELETE FROM history");
  persist();
}

export function historyUrlExists(url: string, kind: string): boolean {
  const want = normalizeVideoUrl(url);
  const stmt = getDb().prepare("SELECT url FROM history WHERE kind = ?");
  stmt.bind([kind]);
  while (stmt.step()) {
    const r = stmt.getAsObject() as { url?: string };
    const u = typeof r.url === "string" ? r.url : "";
    if (normalizeVideoUrl(u) === want) {
      stmt.free();
      return true;
    }
  }
  stmt.free();
  return false;
}

export function historyGetMediaPathByUrl(url: string, kind: string): string | null {
  const want = normalizeVideoUrl(url);
  const stmt = getDb().prepare(
    "SELECT media_path, url FROM history WHERE kind = ? ORDER BY created_at DESC",
  );
  stmt.bind([kind]);
  while (stmt.step()) {
    const r = stmt.getAsObject() as { media_path?: string; url?: string };
    const u = typeof r.url === "string" ? r.url : "";
    if (normalizeVideoUrl(u) === want) {
      const p = r.media_path;
      stmt.free();
      return typeof p === "string" && p.length > 0 ? p : null;
    }
  }
  stmt.free();
  return null;
}

export function historyGetExistingMediaPathByUrl(url: string, kind: string): string | null {
  const want = normalizeVideoUrl(url);
  const stmt = getDb().prepare(
    "SELECT media_path, url FROM history WHERE kind = ? ORDER BY created_at DESC",
  );
  stmt.bind([kind]);
  while (stmt.step()) {
    const r = stmt.getAsObject() as { media_path?: string; url?: string };
    const u = typeof r.url === "string" ? r.url : "";
    if (normalizeVideoUrl(u) !== want) continue;
    const p = typeof r.media_path === "string" ? r.media_path : "";
    if (p && existsSync(p)) {
      stmt.free();
      return p;
    }
  }
  stmt.free();
  return null;
}
