# Changelog

All notable changes to the MCP server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Six structured V2 tools: `auto_animate`, `apply_animation_preset`, `upsert_action_sequence`, `get_action_sequence`, `create_camera_move`, and `validate_project`.
- Deterministic local topology analysis and managed-action compilation from `@excalimate/animation-core`.
- Authoring/action content in revisioned state deltas and action-generation benchmarks.

### Changed
- MCP session state, snapshots, and checkpoints now use the shared `@excalimate/project-schema` V2 codec while legacy MCP checkpoints remain importable.
- All 29 legacy tools and both HTTP/stdio transports remain registered.
- Nested arrays are now the preferred scene/keyframe input; JSON-encoded arrays remain deprecated compatibility wrappers.
- Low-level edits customize or detach affected managed actions rather than silently replacing generated content.
- Shared schema/core packages are published with provenance before the MCP package without bundling browser/player/export UI code.

### Security
- HTTP defaults to loopback and requires explicit authentication for remote bindings.
- Strict Host, Origin, Fetch Metadata, body/session/SSE/resource, pairing, cleanup, request timeout, and sanitized request-ID error controls from the hardened transport are preserved.

### Deprecated
- `share_project` no longer attempts originless Worker uploads. It returns an actionable checkpoint/import/authenticated-browser-share path until a documented server-to-server authentication contract exists.

### Fixed
- N/A

## [0.4.1] - 2026-03-22

### Added
- N/A

### Changed
- Share URL now points to app.excalimate.com

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
