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

### Security

- N/A

### Deprecated

- N/A

## [0.5.0] - 2026-07-13

### Added

- Six structured V2 action tools: `auto_animate`, `apply_animation_preset`, `upsert_action_sequence`, `get_action_sequence`, `create_camera_move`, and `validate_project`.
- Deterministic local topology analysis, managed-action compilation, shared validation, and action-generation benchmarks from `@excalimate/animation-core` and `@excalimate/project-schema`.
- Paired, revisioned live previews that isolate each MCP transport's project state, checkpoints, cursor, and unguessable browser preview URL.

### Changed

- Session state, snapshots, deltas, and checkpoints now use the shared V2 project codec while legacy MCP checkpoints remain importable.
- All 29 legacy tools remain available alongside the six structured tools on both HTTP and stdio transports.
- Nested arrays are now the preferred scene and keyframe input; JSON-encoded arrays remain supported as deprecated compatibility wrappers.
- Low-level edits mark affected managed actions as customized or detached instead of silently replacing generated content.
- Shared publishable schema/core packages retain Semantic Versioning and npm provenance and are released before the MCP package.

### Fixed

- Revision and sequence cursors now recover missed or stale live updates through validated full-state synchronization.
- V2 checkpoints preserve managed actions and authoring metadata without breaking compatible legacy checkpoint imports.

### Security

- HTTP binds to loopback by default and requires explicit authentication, allowed hosts, and allowed origins for remote exposure.
- Bounded payloads, nesting, elements, tracks, keyframes, strings, sessions, SSE clients, mutation rates, timeouts, idle cleanup, pairing, Fetch Metadata checks, and sanitized request IDs reduce accidental or abusive resource use.

### Deprecated

- Direct server-side `share_project` upload is safely disabled until a documented server-to-server authentication contract exists; the tool returns checkpoint, import, or authenticated browser-sharing guidance instead.

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
