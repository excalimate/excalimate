# MCP V2 and live hydration

The MCP server is a local authoring companion. Bind it to loopback and connect
the editor with `VITE_MCP_SERVER_URL`; do not expose it as an open remote MCP
service.

V2 action tools (`auto_animate`, `apply_animation_preset`,
`upsert_action_sequence`, `get_action_sequence`, `create_camera_move`, and
`validate_project`) use the same project codec and deterministic compiler as the
browser. Raw-keyframe tools remain compatible but do not create duplicate V2
types.

## Live protocol

Snapshots contain the canonical project and authoring state. Deltas have
monotonic revision and sequence cursors and may add `project` and `authoring`
fields. Older clients that omit those additive fields remain valid.

The editor strictly validates every snapshot and delta before applying it.
Duplicates are ignored. A revision or sequence gap stops delta application and
requests a fresh snapshot, preventing partial live state from being treated as
current. Transfer limits apply before JSON parsing, and user-facing errors omit
stack traces.

Scene, timeline, playback, preferred workspace, actions, authoring revisions,
scene states, and scene transitions hydrate one V2 document. Store updates do
not create a second MCP-only project model.

## Deprecations and security

`share_project` is deprecated and intentionally returns an error with a
checkpoint/import/browser-share path. The share Worker requires a real allowed
browser origin and there is no authenticated MCP server-to-server write
contract. MCP must not spoof `Origin`.

Use `save_checkpoint` for durable local handoff, import the V2 document in the
editor, then use browser sharing. The MCP server does not receive share
encryption keys or delete capabilities.

MCP snapshot/delta content is untrusted: it is size-bounded, schema-validated,
and sanitized again when converted to SVG or PlayerPackage content.
