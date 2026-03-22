# Changelog

All notable changes to the MCP server will be documented in this file.

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
- `create_animated_scene` composite tool — create elements + keyframes + sequences + camera + clip in one call
- Batched state mutations via `addKeyframesBatchToState` — eliminates per-keyframe overhead
- SSE track-level delta broadcasting — only changed tracks/elements sent, not full state
- Gzip compression for SSE payloads >512 bytes
- Element property stripping in SSE deltas (removes non-visual metadata)
- Lazy JSON serialization cache with version counter
- Benchmark suite (`bench/`) with deterministic fixtures and visual reports

### Changed
- `add_keyframes_batch` now uses single-pass batch insertion (was per-keyframe loop)
- `create_sequence` batches all keyframes before applying (was 3× state mutations per element)
- `add_scale_animation` batches scale + translate compensation keyframes
- `set_camera_frame` batches 4 initial camera keyframes in one call
- `add_camera_keyframes_batch` uses batch insertion
- Reference text slimmed from 11KB to 4.6KB, updated workflow to recommend `create_animated_scene`

### Fixed
- N/A

## [0.3.5] - 2026-03-16

- Initial public release
