# Changelog

All notable changes to OmniDL are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.6.0] - 2026-03-27

### Added

- **Search** tab: YouTube search by keyword, grid with thumbnails and metadata; **Fetch on Home** and **Watch in browser**.
- **Home** empty state: **Home overview** dashboard (queue and history counts, shortcuts to Search / Queue / Playlist); fades out while fetching and when video metadata is shown.
- **Playlist**: confirm before enqueue; success modal with **Open queue**.
- **History**: server-side paging with **Load more**.
- **Options**: queue concurrency (1–3); batch notification threshold (default **5**); **Settings saved** toast; app data cleanup (cache, DB, thumbnails, Chromium caches) with **Open folder**; storage size (cleanable vs total); optional **portable data** folder `omnidl-data` next to the executable when writable, with one-time migration from Roaming.
- **IPC**: `shell:openExternal`, storage stats, data path info, portable migration.

### Changed

- **Queue**: display order (active first); parallel downloads up to concurrency; batch completion notifications when the queue is long; duplicate prompt only when a **file still exists** on disk (stale history ignored).
- **URLs**: normalize YouTube (and related) URLs for history and duplicate checks.
- **Branding**: sidebar logo uses **Download** icon; Search tab uses search icon.

### Fixed

- **Duplicate modal**: Esc, backdrop, and close paths always resolve the IPC wait so the queue cannot stall.

## [1.5.1] - 2026-04-01

### Fixed

- **ESLint CI**: avoid `no-control-regex` in filename sanitization (shared `sanitizeFileNameSegment`); **Options** page calls `useTabContentStagger()` so motion variants are defined.

## [1.5.0] - 2026-04-01

### Added

- **History / playlist thumbnails**: cache and UI thumbnails; **Save as** and bulk folder actions where supported.
- **Download complete** modal after a finished download.
- **Tab content motion**: staggered entrance on Home, Playlist, Queue, History, Options, and Instruction when **Full** animation is enabled; **Reduced** skips heavy stagger.
- **Playlist fetch overlay**: darker backdrop with light blur for readability; **Reduced** uses a darker flat overlay without blur.

### Changed

- **Tab transitions**: sidebar stays usable—no extra lock after the sweep; destination can be **queued** during the overlay so rapid clicks land on the last chosen tab without a dead zone after the new page is visible.

## [1.4.4] - 2026-03-29

### Added

- **Disclaimer** (personal / educational use; copyright and platform ToS): shown in **Options** and **Instruction**, documented in **README**.

## [1.4.3] - 2026-03-29

### Fixed

- **Packaged app (NSIS / portable)**: **`ffmpeg-static` ships ffmpeg only**, while yt-dlp post-processors need **ffprobe** in the same directory. Added **`ffprobe-static`**, **`asarUnpack`** for its binaries, and on startup **copy ffmpeg + ffprobe** into **`%AppData%/OmniDL/ffmpeg-bin/`** (or equivalent) so **`--ffmpeg-location`** points at a folder that contains both tools (fixes *ffprobe and ffmpeg not found* after merge / AAC).

## [1.4.2] - 2026-03-28

### Changed

- **Video downloads**: after merge, **ffmpeg** re-encodes audio to **AAC** (`Merger+ffmpeg`) so merged **MP4** files play with sound in Windows Media Player and similar players (avoids **Opus**-in-MP4 playback issues).
- **Formats**: **Best video** selectors use **`bv*+ba/b`** (and tier / playlist equivalents); **`--ffmpeg-location`** uses the **directory** containing the bundled ffmpeg so **merge** runs reliably on Windows.

### Fixed

- **Duplicate download prompt**: history checks use **URL + kind** (`video` vs `audio`), so downloading **best video** and **best audio** for the same link is no longer treated as a duplicate of the other.

## [1.4.1] - 2026-03-28

### Changed

- **Home**: with **auto-fetch** enabled, metadata loading uses a **slim top bar** instead of the full-screen fetch overlay; manual **Fetch** still uses the full overlay.
- **Instruction**: copy updated to describe auto-fetch vs manual fetch behavior.

### Fixed

- **Windows audio downloads**: yt-dlp runs with **`--windows-filenames`** and **`--ffmpeg-location`** set to the bundled **ffmpeg executable** so **best audio** (webm → MP3) is less likely to fail on paths with Unicode or long names.
- **Errors**: user-facing yt-dlp messages prefer **post-processor / ffmpeg** lines when present.

## [1.4.0] - 2026-03-27

### Added

- **Instruction** tab with expandable usage notes.
- **Fetch loading overlay** on Home and Playlist while metadata is loading (including auto-fetch).

### Changed

- **Home**: size estimates for **Best video** and **Best audio** align better with merged DASH downloads (correct `bestvideo+bestaudio` handling, track tie-breakers, small merge and best-audio buffers).
- **Queue**: clearer **Clear** confirmation when work is still active; row click no longer removes items (use **Cancel** on the row).
- **yt-dlp errors**: shorter, clearer messages for common network and cookie cases.

### Fixed

- **Queue**: single-flight **pump** lock avoids overlapping downloads; cleanup of sidecar files (`.part`, fragment temps); audio jobs prefer **MP3** post-process when applicable.
- **History** and **Options** copy tweaks for consistency with the English UI.

## [1.3.5] - 2026-03-28

### Note

- Test release only: in-app update smoke test (no user-facing changes intended).

## [1.3.4] - 2026-03-28

### Fixed

- **Windows auto-update**: set explicit NSIS and portable `artifactName` values so `latest.yml` paths match the installer and portable binaries uploaded to GitHub (avoids HTTP 404 when the YAML pointed at `OmniDL-Setup-*.exe` but the release only had spaced names like `OmniDL Setup *.exe`).

## [1.3.3] - 2026-03-27

### Note

- Test release only: verify in-app update from 1.3.2 (or earlier) without functional changes intended for users.

## [1.3.2] - 2026-03-27

### Fixed

- **Auto-update**: download handler runs `checkForUpdates` before `downloadUpdate` so the updater always has release metadata (avoids silent failure / “check update first” edge cases).
- **Auto-update**: `updater:error` from the main process now opens the error modal during **available**, **downloading**, and **ready** (so **Restart and install** failures such as missing downloaded installer are visible instead of doing nothing).
- **Auto-update**: ignore duplicate `update-available` broadcasts while **downloading** or **ready** so the UI is not reset mid-flow.
- **Options**: **Check app update** surfaces IPC failures via the update error modal.

## [1.3.1] - 2026-03-27

### Changed

- Sidebar footer hint text replaced with author credit (`HyIsNoob - 2026`) for a smaller UI tweak.

## [1.3.0] - 2026-03-27

### Added

- **Facebook**: detect and normalize URLs (`facebook.com`, `m.facebook.com`, `fb.watch`, `fb.com`) on Home and clipboard; metadata shows `facebook` platform when yt-dlp reports it.
- **Updates**: in-app update flow (neo-brutal modals) replacing OS `confirm` dialogs — available → download with **progress bar, speed, transferred/total** → ready to **Restart and install**; optional **Hide** while downloading; **Finish update (restart)** in Options when an install is pending.
- Main process forwards `download-progress`, `update-downloaded` (with version), and `error` to the renderer; updater listeners attach once per session.

### Changed

- Update UI and Options copy in **English** for consistency with README / CHANGELOG.
- Filename quality slug no longer appends `-Video` / `-Audio` (label only, e.g. `Best-video`, `Best-audio`).

### Fixed

- Update errors after closing the download dialog still surface (`setError` forces modal open).
- Progress events ignored unless phase is **downloading**; percent normalized for 0–1 vs 0–100 from electron-updater.

## [1.2.0] - 2026-03-27

### Added

- Queue: newest-first order, completion checkmark, video thumbnail / audio affordance, pagination (10 per page), tap row to remove; duplicate download handling with in-app modal (retry as `(1)`, open folder, cancel).
- Predicted output path checks before download; history URL detection for duplicate prompts.
- Filename pattern `OmniDL_(quality-slug)_title [id].ext` so audio and video of the same item get distinct names.
- Playlist: per-video checkboxes, select all / deselect all, enqueue selected only; optional **Full playlist thumbnails** (Settings) to refine thumbnails after flat playlist fetch.
- Clipboard: auto-paste on switch to Home tab when clipboard detect is enabled; playlist tab no longer auto-pastes from clipboard.

### Changed

- Clipboard detection only applies on **Home** (interval + focus paste); other tabs unchanged.
- Duplicate prompt uses custom modal aligned with download-complete styling (no native OS dialog for that flow).
- Home: Download and Add to queue buttons equal width, full row.
- Removed full-window scale animation on tab change.

### Fixed

- Race when queueing video then audio quickly mitigated via stable per-job output naming.

## [1.1.0]

Earlier releases before this changelog; see git history.
