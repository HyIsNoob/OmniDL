import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const v = pkg.version;
const r = spawnSync(process.execPath, [join(here, "extract-changelog.mjs"), `v${v}`], {
  cwd: root,
  stdio: "inherit",
});
process.exit(r.status ?? 1);
