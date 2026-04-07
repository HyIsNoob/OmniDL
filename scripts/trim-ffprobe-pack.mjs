import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const Arch = { ia32: 0, x64: 1, armv7l: 2, arm64: 3 };

export default async function trimFfprobePack(context) {
  const { appOutDir, electronPlatformName, arch } = context;
  const binRoot = join(
    appOutDir,
    "resources",
    "app.asar.unpacked",
    "node_modules",
    "ffprobe-static",
    "bin",
  );
  if (!existsSync(binRoot)) return;

  if (electronPlatformName === "win32") {
    rmSync(join(binRoot, "darwin"), { recursive: true, force: true });
    rmSync(join(binRoot, "linux"), { recursive: true, force: true });
    if (arch === Arch.x64) {
      rmSync(join(binRoot, "win32", "ia32"), { recursive: true, force: true });
    } else if (arch === Arch.ia32) {
      rmSync(join(binRoot, "win32", "x64"), { recursive: true, force: true });
    }
  } else if (electronPlatformName === "darwin") {
    rmSync(join(binRoot, "linux"), { recursive: true, force: true });
    rmSync(join(binRoot, "win32"), { recursive: true, force: true });
    if (arch === Arch.arm64) {
      rmSync(join(binRoot, "darwin", "x64"), { recursive: true, force: true });
    } else if (arch === Arch.x64) {
      rmSync(join(binRoot, "darwin", "arm64"), { recursive: true, force: true });
    }
  } else if (electronPlatformName === "linux") {
    rmSync(join(binRoot, "darwin"), { recursive: true, force: true });
    rmSync(join(binRoot, "win32"), { recursive: true, force: true });
    if (arch === Arch.x64) {
      rmSync(join(binRoot, "linux", "ia32"), { recursive: true, force: true });
    } else if (arch === Arch.ia32) {
      rmSync(join(binRoot, "linux", "x64"), { recursive: true, force: true });
    }
  }
}
