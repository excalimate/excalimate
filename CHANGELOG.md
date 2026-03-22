# Changelog

All notable changes to the Excalimate web app will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Lottie JSON (`.json`) and dotLottie (`.lottie`) export formats
  - SVG-based shape rendering captures exact Excalidraw visual style (roughjs hand-drawn strokes, arrowheads, fills)
  - Full keyframe animation support (opacity, translate, scale, rotation, draw progress)
  - Camera pan/zoom animation via null parent layer with inverted transforms
  - Group hierarchy preserved via Lottie layer parenting
  - Proper camera frame → composition coordinate mapping with output resolution scaling

### Changed
- N/A

### Fixed
- N/A

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
