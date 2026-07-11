# Excalimate MCP Server

Excalimate MCP server for creating Excalidraw designs and animating them with keyframes. Designed for AI agent integration (Claude Desktop, Copilot CLI, etc.).

**Pair with [app.excalimate.com](https://app.excalimate.com) for real-time live preview** — the AI creates and animates, you watch it happen in your browser.

## Getting Started with app.excalimate.com

The fastest way to use Excalimate with AI is to combine the deployed web app with this npm package. No cloning, no building — just install and go.

### Step 1: Start the MCP server

```bash
npx @excalimate/mcp-server
# -> MCP server listening on http://127.0.0.1:3001/mcp

# Custom port:
npx @excalimate/mcp-server --port 4000
```

HTTP mode binds to `127.0.0.1` by default. Port priority is CLI (`--port` / `-p`), then `PORT`, then `3001`. `--port=4000` is also supported.

Or install globally:

```bash
npm install -g @excalimate/mcp-server
excalimate-mcp
```

### Step 2: Connect your AI

Point your AI tool to `http://127.0.0.1:3001/mcp`. When the MCP session initializes, the server prints a unique pairing URL:

```text
[excalimate] Preview paired for session ...:
http://127.0.0.1:3001/p/UNGUESSABLE_PREVIEW_ID
```

Each MCP transport has isolated project state and its own unguessable preview ID.

### Step 3: Open the web app

Go to [app.excalimate.com](https://app.excalimate.com), open **File → Preferences**, and use the printed pairing URL as the MCP server URL. Click **Live** in the toolbar. The app appends `/live` and `/state` to that base URL, so it follows only the paired MCP session.

## Features

- **35 tools**: all 29 legacy tools plus six structured V2 action tools
- **Shared V2 model**: checkpoints and snapshots use `@excalimate/project-schema`; managed recipes use `@excalimate/animation-core`
- **Deterministic action authoring**: explicit local scopes/styles, no hosted model and no scene-content upload
- **Dual transport**: stdio (Claude Desktop) + Streamable HTTP (cloud deployment)
- **Paired live preview**: Per-session real-time updates via an unguessable preview URL
- **Sequence reveal**: Staggered element reveal animations in one tool call
- **Camera animation**: Pan/zoom keyframes for cinematic effects
- **Session-scoped checkpoints**: Save/load complete state without crossing HTTP transport boundaries
- **Runtime versioning**: Server version is read from `package.json`

## Installation & Usage

### HTTP mode (recommended — enables live preview)

```bash
npx @excalimate/mcp-server
# -> http://127.0.0.1:3001/mcp

# Custom port:
npx @excalimate/mcp-server -p 4000
```

Configure your AI tool below. After it initializes an MCP session, copy the printed preview pairing URL into the web app's MCP server URL preference and click **Live**.

### HTTP security and configuration

The default loopback binding rejects DNS-rebinding-style Host values and browser requests from origins outside the allowlist. Origin, Host, authentication, and Fetch Metadata checks are applied consistently to `/mcp`, `/live`, and `/state`.

```bash
# Network exposure requires an explicit token.
excalimate-mcp \
  --host 192.168.1.20 \
  --auth-token "replace-with-at-least-16-characters" \
  --allowed-hosts 192.168.1.20 \
  --allowed-origins https://app.excalimate.com

# Wildcard binds also require concrete allowed Host values.
excalimate-mcp \
  --host 0.0.0.0 \
  --auth-token "replace-with-at-least-16-characters" \
  --allowed-hosts 192.168.1.20,my-machine.local
```

Use `Authorization: Bearer TOKEN` for `/mcp`. Authenticated servers print a preview URL containing a session-scoped derived access key, so the web app does not need the MCP bearer token.

| Setting | Default | Environment |
|---|---:|---|
| Bind host | `127.0.0.1` | `EXCALIMATE_HOST` |
| Allowed browser origins | local Vite + Excalimate domains | `EXCALIMATE_ALLOWED_ORIGINS` (`CORS_ORIGIN` compatible) |
| Allowed Host values | loopback names, or the explicit bind host | `EXCALIMATE_ALLOWED_HOSTS` |
| JSON body limit | 1 MiB | `EXCALIMATE_BODY_LIMIT_BYTES` |
| Request timeout | 30 seconds | `EXCALIMATE_REQUEST_TIMEOUT_MS` |
| Concurrent MCP sessions | 16 | `EXCALIMATE_MAX_SESSIONS` |
| Preview SSE clients | 32 | `EXCALIMATE_MAX_SSE_CLIENTS` |
| Session idle TTL | 30 minutes | `EXCALIMATE_SESSION_TTL_MS` |

Run `excalimate-mcp --help` for CLI options. Project resource limits also bound elements, tracks, keyframes, strings, nesting, animation times, total state size, and per-session mutation rate.

### Configure your AI tool

<details>
<summary><strong>VS Code (GitHub Copilot) — ✅ live preview</strong></summary>

Add to your VS Code MCP config (`.vscode/mcp.json` or user-level `mcp.json`):

**HTTP mode (recommended — live preview works):**

```jsonc
{
  "servers": {
    "excalimate": {
      "type": "http",
      "url": "http://127.0.0.1:3001/mcp"
    }
  }
}
```

Start the MCP server, let Copilot initialize it, then copy the printed preview pairing URL into the web app before clicking **Live**.

**stdio mode (no live preview):**

```jsonc
{
  "servers": {
    "excalimate": {
      "type": "stdio",
      "command": "npx",
      "args": ["@excalimate/mcp-server", "--stdio"]
    }
  }
}
```

</details>

<details>
<summary><strong>Claude Desktop — stdio only (no live preview)</strong></summary>

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "excalimate": {
      "command": "npx",
      "args": ["@excalimate/mcp-server", "--stdio"]
    }
  }
}
```

Claude Desktop uses stdio transport, so there's no live preview. The AI creates scenes and animations, then use `save_checkpoint` to save state and load it in [app.excalimate.com](https://app.excalimate.com) via the **MCP** button in the toolbar.

</details>

<details>
<summary><strong>Claude Code (CLI) — ✅ live preview</strong></summary>

Claude Code supports HTTP MCP servers. Start the server first, then add it:

```bash
npx @excalimate/mcp-server &
claude mcp add excalimate http://127.0.0.1:3001/mcp
```

Copy the pairing URL printed after Claude initializes the MCP session into the web app, then click **Live**.

</details>

<details>
<summary><strong>Cursor — ✅ live preview</strong></summary>

In Cursor settings, go to **MCP Servers** and add:

- **Name:** `excalimate`
- **Type:** `http`
- **URL:** `http://127.0.0.1:3001/mcp`

Start the server and Cursor, then use the printed preview pairing URL in the web app.

</details>

<details>
<summary><strong>Windsurf — ✅ live preview</strong></summary>

Add to your Windsurf MCP config:

```json
{
  "mcpServers": {
    "excalimate": {
      "serverUrl": "http://127.0.0.1:3001/mcp"
    }
  }
}
```

Start the server and Cascade, then use the printed preview pairing URL in the web app.

</details>

<details>
<summary><strong>Any HTTP-compatible MCP client — ✅ live preview</strong></summary>

Point your MCP client to:

```
http://127.0.0.1:3001/mcp
```

Start the server and initialize the MCP client, then use the printed preview pairing URL in the web app.

</details>

> **Tip:** HTTP mode (the default) is always preferred — it enables live preview so you can watch the AI build your animation in real-time. stdio mode is only needed for tools that don't support HTTP transport (like Claude Desktop).

### From source (for development)

```bash
git clone https://github.com/excalimate/excalimate.git
cd excalimate
npm install
npm run build --workspace @excalimate/project-schema
npm run build --workspace @excalimate/animation-core
npm run build --workspace @excalimate/mcp-server
cd mcp-server
node dist/index.js          # HTTP mode
node dist/index.js --port 4000
node dist/index.js --stdio  # stdio mode
```

## Tools

### Action-first workflow

Create scene elements first, then prefer structured actions over raw keyframes:

1. `auto_animate` for a deterministic topology-based recipe with explicit `scope` and `style`.
2. `apply_animation_preset` for fade, draw, pop, or directional slide recipes.
3. `upsert_action_sequence` for explicit typed action choreography.
4. `create_camera_move` for managed camera movement.
5. `get_action_sequence` and `validate_project` before checkpointing.

Natural-language interpretation belongs to the connected MCP client. The server runs only local deterministic analysis/compilation and never sends scene content to an AI service. Managed actions refuse to overwrite customized or unmanaged keyframes. Low-level edits of managed tracks mark actions `customized`; deletion of generated content marks them `detached`.

### V2 Action Tools
| Tool | Description |
|------|-------------|
| `auto_animate` | Analyze an explicit local scope/style and compile the shared deterministic recipe |
| `apply_animation_preset` | Apply a bounded structured preset |
| `upsert_action_sequence` | Add or update typed managed actions |
| `get_action_sequence` | Return actions and authoring revisions |
| `create_camera_move` | Create a managed V2 camera action |
| `validate_project` | Validate current/supplied content with the shared V2 codec |

### Scene Tools
| Tool | Description |
|------|-------------|
| `read_me` | Element format reference + animation docs |
| `get_examples` | Few-shot examples for elements and animations |
| `create_scene` | Create/replace scene from elements JSON |
| `add_elements` | Add elements to existing scene |
| `remove_elements` | Remove elements by ID |
| `update_elements` | Modify element properties |
| `get_scene` | Return current scene as JSON |
| `clear_scene` | Clear all elements and animations |
| `delete_items` | Remove specific elements + their animation tracks |

### Animation Tools
| Tool | Description |
|------|-------------|
| `add_keyframe` | Add keyframe (auto-creates track) |
| `add_keyframes_batch` | Bulk add keyframes |
| `remove_keyframe` | Remove a keyframe |
| `create_sequence` | Staggered reveal animation |
| `set_clip_range` | Set export start/end times |
| `get_timeline` | Return timeline as JSON |
| `clear_animation` | Clear all tracks |

### Camera Tools
| Tool | Description |
|------|-------------|
| `set_camera_frame` | Set camera position/size/aspect + creates t=0 keyframes |
| `add_camera_keyframe` | Animate camera pan/zoom |
| `add_camera_keyframes_batch` | Bulk camera keyframes |

Scene arrays, `add_keyframes_batch`, `add_scale_animation`, `add_camera_keyframes_batch`, and all arrays in `create_animated_scene` accept nested arrays directly. JSON-encoded strings remain compatibility wrappers on the same tool names and return deprecation metadata/messages. They will not be removed without a documented minor-version deprecation window.

```json
{
  "keyframes": [
    {
      "targetId": "box1",
      "property": "opacity",
      "time": 500,
      "value": 1,
      "easing": "easeOut"
    }
  ]
}
```

Snapshots contain a V2 project document plus transport `revision` and `sequence` and compatibility playback fields. Deltas include `baseRevision`, `revision`, and `sequence`; clients that detect a gap fetch the paired `/state` endpoint. Deltas fingerprint and include actual scene, timeline, playback, metadata, and authoring/action content rather than collection counts.

The current browser live bridge safely ignores additive `authoring` and `project` delta fields. Creator-stack UI integration must consume those fields when managed actions become editable in the creator.

### Inspection Tools
| Tool | Description |
|------|-------------|
| `are_items_in_line` | Check horizontal/vertical alignment |
| `is_camera_centered` | Check if camera is centered on content |
| `items_visible_in_camera` | Report visibility of items at a given time |
| `animations_of_item` | Describe all animations of an element |

### Sharing Tools
| Tool | Description |
|------|-------------|
| `share_project` | Deprecated; returns a safe checkpoint/import/browser-share path without uploading |

The sharing Worker intentionally rejects originless writes, and there is no authenticated MCP server-to-server sharing contract. `share_project` therefore returns `isError: true`, does not read or upload project content, and directs clients to `save_checkpoint`, V2 import, and the authenticated browser sharing flow. The MCP server does not spoof a browser `Origin`.

### Checkpoint Tools
| Tool | Description |
|------|-------------|
| `save_checkpoint` | Save scene + animation state |
| `load_checkpoint` | Restore from checkpoint |
| `list_checkpoints` | List saved checkpoints |

## Example Workflow

```
1. read_me
2. create_scene { elements: [...] }
3. auto_animate {
     scope: { elementIds: ["box1", "arrow1", "box2"] },
     style: { intensity: "balanced" }
   }
4. get_action_sequence
5. validate_project
6. set_clip_range { start: 0, end: 5000 }
7. save_checkpoint { id: "demo" }
```

## Versioning and deprecation

`@excalimate/mcp-server` remains a `0.x` package, so it is not presented as stable GA. Releases follow SemVer within that constraint: additive tools ship in minor releases, fixes in patches, and incompatible changes require a minor release plus migration notes. Existing tool names and transport modes remain compatible. Deprecated compatibility inputs emit explicit messages and remain supported for at least one subsequent minor release unless a security issue requires faster removal.
