# Realtime Collaboration Plan for Excalimate

## Purpose

Design and deliver production-grade realtime collaboration for Excalimate with the same user-level feel as Excalidraw:

- near-instant shared editing
- stable behavior on flaky networks
- deterministic convergence
- strong security/privacy posture
- low-friction developer ergonomics for future features

---

## Priority Order

1. **Synchronization correctness and connection robustness**
2. **Speed and performance efficiency**
3. **Security and privacy**
4. **Ease of development and feature extensibility**

---

## 1) Product Scope

### In Scope

- Multi-user collaboration for:
  - scene elements and z-order
  - timeline tracks and keyframes
  - camera frame and clip range
  - project-level metadata
- Presence:
  - cursors
  - user labels/colors
  - active selections
  - optional viewport ghosting
- MCP parity:
  - MCP acts as a first-class actor in rooms
  - MCP updates follow the same mutation pipeline as human edits
- Robust reconnect:
  - resume from last acknowledged version
  - fallback snapshot rehydrate if resume window is expired

### Out of Scope (Initial Release)

- Per-element ACLs (room-level roles first)
- Built-in voice/video calls
- Cross-room references

---

## 2) Success Criteria (Acceptance Targets)

### Correctness

- All clients converge to the same state after quiescence.
- Duplicate/out-of-order packets never produce divergent state.
- Undo/redo remains collaboration-safe.

### Reliability

- Client reconnect restores room state without manual refresh.
- Resume works when reconnecting within replay retention.
- Full rehydrate path works when replay retention is exceeded.

### Performance

- Local edits apply optimistically in one frame.
- Network payloads are delta-based (not full-state) after initial sync.
- Presence traffic does not starve document mutation traffic.

### Security

- Every mutation is authenticated, authorized, validated, and rate-limited.
- Sensitive room data is encrypted in transit and at rest.

### Developer Experience

- New features integrate through one typed mutation layer.
- Collaboration logic is isolated from UI rendering concerns.

---

## 3) Architecture Overview

## 3.1 Core Components

1. **Realtime Gateway (WebSocket)**
   - room session lifecycle (join/leave/resume)
   - message routing and fan-out
   - heartbeat/liveness and backpressure handling

2. **Room State Engine (CRDT-backed)**
   - single canonical collaborative document per room
   - conflict-free merge for concurrent writes
   - idempotent update application

3. **Persistence Layer**
   - snapshot store for compact room state
   - append-only update log for replay
   - retention policy + compaction jobs

4. **Presence Channel**
   - ephemeral awareness data (cursor, selection, viewport)
   - TTL-based expiry, non-persistent

5. **Auth + Access Control**
   - signed room tokens
   - role gates (owner/editor/viewer)
   - mutation-level authorization checks

6. **Observability + Ops**
   - structured logs, metrics, tracing
   - divergence detectors
   - SLO alerts and incident hooks

## 3.2 Recommended Technology Stack

- **Collab document engine:** Yjs (mature, efficient binary updates, battle-tested for collaborative editors)
- **Realtime transport:** WebSocket primary
- **Backend topology (recommended):**
  - Cloudflare Durable Objects for room affinity + sequential room processing
  - Durable storage for snapshots and replay logs
- **Alternative topology:** Node workers + Redis pub/sub + Postgres snapshots/logs

Durable Objects are preferred for simpler room-level consistency and lower operational complexity.

---

## 4) Collaboration Data Model

Use one logical room document partitioned by domain to keep coupling low and future additions simple.

## 4.1 Persisted Partitions

- `scene.elementsById`
- `scene.order`
- `timeline.tracksById`
- `timeline.trackOrder`
- `timeline.keyframesByTrackId`
- `project.cameraFrame`
- `project.clipRange`
- `project.meta`

## 4.2 Ephemeral Partitions

- `presence.usersBySessionId`

## 4.3 ID and Ordering Rules

- IDs are stable and globally unique (`elementId`, `trackId`, `keyframeId`).
- Never use array index as identity.
- Ordering is represented explicitly (`scene.order`, `timeline.trackOrder`).
- Reordering changes only order structures, not entity payloads.

## 4.4 Tombstones and Deletes

- Soft-delete tombstones retained in replay window to dedupe stale retries.
- Compaction removes old tombstones after safe retention horizon.

---

## 5) Mutation Contract (Single Source of Truth)

All state-changing actions (UI, hotkeys, MCP, import flows, undo/redo) must produce typed mutations through one shared contract.

## 5.1 Envelope

Each mutation includes:

- `mutationId`
- `roomId`
- `sessionId`
- `actorType` (`human` | `mcp` | `system`)
- `baseVersion`
- `timestamp`
- `type`
- `payload`

## 5.2 Mutation Types (Initial Set)

- `scene.upsertElements`
- `scene.removeElements`
- `scene.reorderElements`
- `timeline.upsertTracks`
- `timeline.removeTracks`
- `timeline.upsertKeyframes`
- `timeline.removeKeyframes`
- `timeline.reorderTracks`
- `project.setCameraFrame`
- `project.setClipRange`
- `project.updateMeta`

## 5.3 Idempotency

- Server stores recent `mutationId`s per room window.
- Duplicate mutations return prior ack without reapplication.
- Clients dedupe inbound mutations already applied locally.

## 5.4 Validation

- Runtime schema validation for each mutation payload.
- Hard limits for payload size and per-mutation cardinality.
- Reject malformed mutations with typed error responses.

---

## 6) Sync Protocol

## 6.1 Session Handshake

1. Client opens WebSocket with auth token.
2. Server validates token + role.
3. Client sends `resumeToken` and `lastAckedVersion`.
4. Server responds:
   - replay delta stream if resumable
   - otherwise snapshot + delta tail
5. Client emits `ready` after applying sync baseline.
6. Presence stream begins after `ready`.

## 6.2 Message Classes

- `client.mutation`
- `server.ack`
- `server.delta`
- `client.presence`
- `server.presence`
- `server.snapshot`
- `server.error`
- `client.ping` / `server.pong`
- `server.slowdown`

## 6.3 Delivery Semantics

- At-least-once transport delivery
- Exactly-once mutation effect via dedupe
- Per-room sequential processing at server
- Client-side buffering for short network stalls

## 6.4 Reconnect

- Exponential backoff + jitter
- Resume token persisted in memory + session storage
- Automatic full rehydrate on resume invalidation

---

## 7) Conflict Resolution Rules

CRDT merge handles base conflicts; domain rules guarantee deterministic business behavior.

### Scene Rules

- Last writer wins for scalar fields on same element revision.
- Reorders merge via order structure conflict strategy (Yjs array semantics).
- Deletes dominate stale upserts older than tombstone version.

### Timeline Rules

- Keyframe identity is `trackId + keyframeId`.
- Concurrent edits of same keyframe field resolve by CRDT order + deterministic tie-break (`actorPriority`, then logical clock).
- Track delete removes child keyframes via cascading mutation.

### Camera / Clip Rules

- Single object merge with field-level conflict resolution.
- Optional lock semantic can be added later for high-contention sessions.

---

## 8) Undo/Redo in Collaborative Rooms

Undo/redo is operation-based, not local snapshot rollback.

- Local stack stores inverse mutations for locally-authored operations.
- Undo emits a new inverse mutation.
- Redo emits a new forward mutation.
- Remote operations remain untouched.
- MCP-authored mutations are not added to a human user’s undo stack.

This keeps history auditable and convergence-safe.

---

## 9) Presence Model

Presence is ephemeral and non-persistent.

## 9.1 Payload

- cursor position
- selection IDs
- viewport transform
- user identity (name, color, avatar)

## 9.2 Performance Rules

- cursor updates throttled
- viewport updates sampled
- selection updates debounced
- drop presence packets first under pressure, never document mutations

---

## 10) MCP as a First-Class Collaborator

MCP mutations must flow through the exact same mutation bus as human edits.

## Rules

- MCP has unique `sessionId` and `actorType: mcp`.
- MCP operations are validated and authorized the same way as human operations.
- Burst control caps MCP mutation throughput per room.
- MCP updates are attributed in audit logs and optional UI activity feed.

This prevents side channels and ensures one consistency model for all writers.

---

## 11) Security and Privacy

## 11.1 Authentication and Authorization

- Signed short-lived JWT room tokens
- Claims include room, role, and expiry
- Role gates:
  - owner: full control
  - editor: mutate document
  - viewer: read + presence only

## 11.2 Transport and Storage Security

- TLS-only transport
- strict origin checks
- encrypted persistence for snapshots/logs
- secret rotation for signing keys

## 11.3 Abuse Controls

- per-session and per-room rate limits
- schema + size validation
- malformed client quarantine (temporary room mute/kick)

## 11.4 Optional End-to-End Encryption Mode

For Excalidraw-like private rooms:

- room key carried in URL hash fragment
- client encrypts mutation payloads before sending
- server stores/relays ciphertext only

Ship as a later hardening phase after trusted-mode GA.

---

## 12) Performance Strategy

## 12.1 Network Efficiency

- binary document updates (CRDT deltas)
- optional frame compression for large payloads
- mutation batching per animation frame
- coalescing of repetitive transient writes

## 12.2 Client Efficiency

- single batched store apply per inbound delta
- selector-level memoization by ID sets
- avoid full-scene recompute when only timeline/project partitions change

## 12.3 Large Room Strategy

- chunked initial sync
- progressive hydration for large history
- snapshot compaction to bound replay size

## 12.4 Operational Guardrails

- max payload bytes
- max mutations/sec/session
- backpressure `slowdown` signals
- circuit-breakers for pathological clients

---

## 13) Developer Experience and Extensibility

Create a dedicated collaboration module boundary:

```text
src/collab/
  transport/
  protocol/
  document/
  mutations/
  presence/
  auth/
  testing/
```

### Standards

- No raw socket sends from feature code.
- Feature code can only call typed mutation helpers.
- Every new shared feature must ship with:
  1. mutation schema
  2. authorization rule
  3. inverse mutation for undo
  4. convergence tests
  5. reconnect tests

This keeps future features naturally collaboration-ready.

---

## 14) Testing and Verification

## 14.1 Deterministic Test Matrix

- 2, 5, 10 concurrent clients
- small, medium, large, very-large documents
- scripted conflict scenarios and randomized interleavings

## 14.2 Required Test Categories

- convergence/property tests
- reconnect/resume tests
- out-of-order + duplicate delivery tests
- bandwidth/perf regression tests
- authz/security tests
- MCP burst and mixed-actor tests

## 14.3 Key Metrics

- p50/p95 mutation apply latency
- bytes per mutation and per minute
- reconnect success rate
- replay catch-up duration
- divergence incidents (target: zero)

## 14.4 CI Integration

- Run deterministic collab suite on PRs touching stores, collab modules, MCP bridge, or protocol code.
- Publish benchmark artifacts and trend comparisons.

---

## 15) Rollout Plan

## Phase 0 - Foundation

- Introduce mutation schema, validators, and local adapter.
- Add collaboration telemetry in single-user mode.

## Phase 1 - Scene Collaboration

- Room service, auth, resume, presence cursors.
- Scene element + order syncing behind feature flag.

## Phase 2 - Timeline Collaboration

- Track/keyframe syncing.
- Collaboration-safe undo/redo.

## Phase 3 - Camera and Clip Collaboration

- Camera frame + clip range synchronization.
- Conflict tuning and perf pass for playback metadata.

## Phase 4 - MCP Collaboration Integration

- Route MCP writes through mutation bus.
- Add actor attribution and throughput controls.

## Phase 5 - Security Hardening

- Tightened quotas and anomaly detection.
- Optional E2EE mode.

## Phase 6 - Production Ramp

- Controlled feature-flag rollout.
- SLO-based ramp decisions and incident runbooks.

---

## 16) Risks and Mitigations

- **Risk:** state divergence in edge races  
  **Mitigation:** CRDT core + deterministic domain rules + convergence test gates.

- **Risk:** heavy rooms degrade responsiveness  
  **Mitigation:** chunked sync, batching, compaction, and guardrails.

- **Risk:** collaboration complexity slows feature delivery  
  **Mitigation:** strict mutation boundary and feature checklist.

- **Risk:** abuse/security regressions at scale  
  **Mitigation:** layered authz, validation, rate limits, auditability, staged rollout.

---

## 17) Deliverables Checklist

- [ ] Architecture RFC for collaboration protocol and data model
- [ ] Typed mutation package with validators and tests
- [ ] Realtime gateway with resume + presence
- [ ] Room persistence (snapshot + replay log + compaction)
- [ ] Scene/timeline/camera/clip store adapters
- [ ] Collaboration-safe undo/redo
- [ ] Deterministic convergence and load test suites
- [ ] Security controls (authz, rate limits, validation, auditing)
- [ ] Optional E2EE mode
- [ ] Rollout playbooks + SLO dashboards

---

## Recommended First Slice

Ship **scene + presence** first behind a feature flag, but build on the final mutation envelope from day one.  
This validates transport reliability and convergence early while minimizing rework when timeline/camera collaboration is added.
