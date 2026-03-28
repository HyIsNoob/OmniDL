import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import initSqlJs, { type Database } from "sql.js";
import { fileURLToPath } from "node:url";

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
  getDb().run(
    `INSERT OR REPLACE INTO history (id, url, title, platform, media_path, quality, kind, created_at, thumbnail_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.url,
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

export function historyUrlExists(url: string): boolean {
  const stmt = getDb().prepare("SELECT 1 FROM history WHERE url = ? LIMIT 1");
  stmt.bind([url]);
  const ok = stmt.step();
  stmt.free();
  return ok;
}

export function historyGetMediaPathByUrl(url: string): string | null {
  const stmt = getDb().prepare(
    "SELECT media_path FROM history WHERE url = ? ORDER BY created_at DESC LIMIT 1",
  );
  stmt.bind([url]);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const row = stmt.getAsObject() as { media_path?: string };
  stmt.free();
  const p = row.media_path;
  return typeof p === "string" && p.length > 0 ? p : null;
}
