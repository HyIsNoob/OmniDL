# OmniDL

Desktop app (Electron) for downloading **YouTube** and **TikTok** with a neo-brutalist UI: sequential queue, format selection, history (SQLite via sql.js), clipboard detection, **yt-dlp** updates, and in-app updates via GitHub Releases (electron-updater).

## Screenshots (placeholders)

Replace the SVG files in [`docs/screenshots/`](docs/screenshots/) with real PNG/JPG exports (same filenames or update the paths below).


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

## Auto-update

`build.publish` in `package.json` points at GitHub. After a release is published, the app uses `electron-updater` against that feed. Code signing may be required for strict Windows SmartScreen policies depending on your environment.

## License

MIT
