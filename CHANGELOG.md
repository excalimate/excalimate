# Changelog

All notable changes to the Excalimate web app will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- N/A

### Changed
- N/A

### Fixed
- N/A

## [0.4.0] - 2026-03-22

### Added
- Lottie JSON (`.json`) and dotLottie (`.lottie`) export formats
  - SVG-based shape rendering captures exact Excalidraw visual style (roughjs hand-drawn strokes, arrowheads, fills)
  - Full keyframe animation support (opacity, translate, scale, rotation, draw progress)
  - Camera pan/zoom animation via null parent layer with inverted transforms
  - Group hierarchy preserved via Lottie layer parenting
  - Proper camera frame → composition coordinate mapping with output resolution scaling
- Image export scope selection (`Whole canvas` or `Selected elements`)
  - Group selections expand to member elements and preserve bound text labels in selected-only exports
- Image export background mode (`Include canvas background` or `No background`) for PNG/SVG
  - JPG exports automatically include background because JPG does not support transparency
- Lottie text rendering mode selection in the export dialog (`Inline fonts`, `Glyph shapes`, or both)
  - Inline mode keeps native Lottie text layers with font metadata
  - Glyph mode converts text to vector shapes for maximum cross-player compatibility
- Consent-based analytics with PostHog
  - Cookie consent banner with compact view and detailed preferences modal
  - Three consent categories: Necessary (always on), Preferences (toggleable), Analytics (toggleable)
  - PostHog only captures events when analytics consent is granted (`opt_out_capturing_by_default`)
  - Consent state persisted in localStorage with versioning for migrations
  - Cookie Settings accessible from File menu to manage preferences at any time
  - Privacy Policy page on the landing page at `/privacy`
  - Utility functions `canStorePreferences()`, `storePreference()`, `readPreference()` for consent-aware preference storage
- Comprehensive event tracking across the app
  - File operations: project created/saved/loaded, Excalidraw import
  - Export: format tracked on each export
  - Animation: keyframe add/move/delete, track toggle/remove, sequence create/update/delete
  - Playback: play/pause/stop actions
  - Mode switching, camera changes, theme toggles, panel toggles
  - MCP connect/disconnect, project sharing, element grouping
  - All tracking consent-gated and PII-free

### Changed
- Optimized glyph export fallback path to reuse a single SVG render per text element before PNG raster fallback
- Updated app-facing URLs in docs/share defaults to `https://app.excalimate.com` while keeping landing and share service domains unchanged

### Fixed
- Lottie glyph text mode no longer exports invisible text when path glyph extraction is unavailable
  - Falls back to embedded PNG image layers for text to preserve visibility across players
- Lottie glyph path exports now inject fill paint when SVG glyph paths do not carry inline fill/stroke attributes
- Lottie exports now preserve scale-origin behavior by compensating scale keyframes for Lottie center-anchored layer transforms

## [0.3.0] - 2026-03-22

### Added
- New Project modal with name and aspect ratio selection
- Onboarding overlay with hand-drawn Excalidraw-style arrows and hints
- MCP Setup Guide page accessible from the welcome overlay
- Image export (PNG, JPG, SVG) with source selection and 1x–4x scale
- Dark/light theme toggle for exports
- GitHub stars link and credits popover in the toolbar
- ESC clears keyframe selection via capture-phase handler
- Property panel shows keyframe editors when keyframes are selected without an element

### Changed
- Default theme is now light mode (persists user preference)
- Export modal redesigned with Video/Image tabs and shared theme control
- Animate mode shows correct animation state on initial load (no scrub needed)
- Live MCP preview stays in edit mode until keyframes are added
- SSE delta messages merged incrementally (scene + timeline)
- `extractTargets()` skipped when only element properties change (not IDs)

### Fixed
- Undo restoring deleted elements no longer creates false keyframes
- Group deletion now properly restores animation tracks on undo
- `toggleMode()` now triggers `computeFrameAtTime` when entering animate mode
- Elements no longer disappear during MCP live preview in edit mode
- Removed opacity clamping in animation preview

## [0.2.0] - 2026-03-16

- Initial public release
