# OmniDL

Desktop app (Electron) for downloading **YouTube** and **TikTok** with a neo-brutalist UI: sequential queue, format selection, history (SQLite via sql.js), clipboard detection, **yt-dlp** updates, and in-app updates via GitHub Releases (electron-updater).

## Screenshots (placeholders)

Replace the SVG files in [`docs/screenshots/`](docs/screenshots/) with real PNG/JPG exports (same filenames or update the paths below).

| Tab | Placeholder |
|-----|-------------|
| Home | ![Home](docs/screenshots/placeholder-home.svg) |
| Queue | ![Queue](docs/screenshots/placeholder-queue.svg) |
| Playlist | ![Playlist](docs/screenshots/placeholder-playlist.svg) |
| Options | ![Options](docs/screenshots/placeholder-options.svg) |

Recommended aspect ratio: ~16:9 (e.g. 1280×720).

## Features

- **Home**: paste URL, fetch metadata, pick video/audio and format, enqueue downloads.
- **Queue**: sequential downloads, progress / pause / cancel; FFmpeg via `ffmpeg-static`.
- **YouTube playlist**: list entries and bulk enqueue (configurable limit).
- **History**: download history (sql.js).
- **Options**: download folder, clipboard watch, auto-fetch, yt-dlp check/update, app updates.

## Requirements

- **Windows** (current build targets NSIS installer + portable).
- [Node.js](https://nodejs.org/) 20+ to build from source.

## Install from a release

Download the installer or portable build from [Releases](https://github.com/HyIsNoob/OmniDL/releases).

## Build from source

```powershell
npm ci
npm run build
npm run dist
```

- Output is written to `release/` (gitignored).
- To publish a release on GitHub, see **Releases with GitHub Actions** below.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev mode (electron-vite) |
| `npm run build` | Build main, preload, and renderer |
| `npm run lint` | ESLint |
| `npm run dist` | Build + electron-builder (no publish) |
| `npm run release` | Build + publish to GitHub Releases (`GH_TOKEN` / CI) |

## Releases with GitHub Actions

1. Bump `version` in `package.json` for each release (and `repository` / `build.publish` if the repo changes).
2. Commit, tag, and push:

```powershell
git add -A
git commit -m "Release v1.0.1"
git tag v1.0.1
git push origin main
git push origin v1.0.1
```

The **Release** workflow (`.github/workflows/release.yml`) runs on Windows, builds the installer + portable, and attaches them to the GitHub Release.

The **CI** workflow (`.github/workflows/ci.yml`) runs lint + build on every push/PR to `main` / `master`.

## Auto-update

`build.publish` in `package.json` points at GitHub. After a release is published, the app uses `electron-updater` against that feed. Code signing may be required for strict Windows SmartScreen policies depending on your environment.

## License

MIT
