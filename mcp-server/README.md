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

- **29 tools** for scene creation, animation, camera control, inspection, checkpointing, and sharing
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
cd mcp-server
npm install
npm run build
node dist/index.js          # HTTP mode
node dist/index.js --port 4000
node dist/index.js --stdio  # stdio mode
```

## Tools

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

`add_keyframes_batch`, `add_scale_animation`, `add_camera_keyframes_batch`, and the animation arrays in `create_animated_scene` now accept nested arrays directly. JSON-encoded strings remain accepted on the same tool names for compatibility and return a deprecation notice.

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

Snapshots include `revision` and `sequence`. Deltas include `baseRevision`, `revision`, and `sequence`; clients that detect a gap should fetch the paired `/state` endpoint for a complete snapshot.

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
| `share_project` | Create E2E encrypted share URL for the current project |

`share_project` accepts `{ baseUrl?: string }` and defaults to `https://app.excalimate.com`, returning URLs like `https://app.excalimate.com/#share=ID,KEY`.

### Checkpoint Tools
| Tool | Description |
|------|-------------|
| `save_checkpoint` | Save scene + animation state |
| `load_checkpoint` | Restore from checkpoint |
| `list_checkpoints` | List saved checkpoints |

## Example Workflow

```
1. read_me                     → Get element format reference
2. create_scene {elements}     → Create a diagram
3. create_sequence {           → Animate elements revealing one by one
     elementIds: ["box1", "arrow1", "box2"],
     property: "opacity",
     startTime: 0,
     delay: 500,
     duration: 800
   }
4. set_clip_range {0, 5000}    → Set 5-second export window
5. save_checkpoint {id: "demo"} → Save for web app preview
   or share_project {baseUrl: "https://app.excalimate.com"} → Generate E2E encrypted share URL
```
