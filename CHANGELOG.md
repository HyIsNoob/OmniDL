# Changelog

All notable changes to OmniDL are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
