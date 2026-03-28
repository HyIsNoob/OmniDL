import fs from "node:fs";

const raw = process.argv[2] ?? "";
const version = raw.replace(/^v/i, "").trim();
if (!version) {
  console.error("Usage: node scripts/extract-changelog.mjs <tag|version>");
  process.exit(1);
}

const text = fs.readFileSync("CHANGELOG.md", "utf8");
const esc = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const re = new RegExp(`##\\s*\\[${esc}\\][\\s\\S]*?(?=\\n##\\s*\\[|$)`);
const m = text.match(re);
if (!m) {
  console.error(`No changelog section found for [${version}]`);
  process.exit(1);
}
const body = m[0].trim() + "\n";
fs.writeFileSync("release-notes.md", body);
