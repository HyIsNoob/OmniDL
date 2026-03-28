# Changelog

All notable changes to OmniDL are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
