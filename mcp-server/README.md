# Excalimate MCP Server

Excalimate MCP server for creating Excalidraw designs and animating them with keyframes. Designed for AI agent integration (Claude Desktop, Copilot CLI, etc.).

**Pair with [excalimate.com](https://excalimate.com) for real-time live preview** — the AI creates and animates, you watch it happen in your browser.

## Getting Started with excalimate.com

The fastest way to use Excalimate with AI is to combine the deployed web app with this npm package. No cloning, no building — just install and go.

### Step 1: Start the MCP server

```bash
npx @excalimate/mcp-server
# → Listening on http://localhost:3001/mcp
# → Live preview SSE at http://localhost:3001/live
```

Or install globally:

```bash
npm install -g @excalimate/mcp-server
excalimate-mcp
```

### Step 2: Open the web app

Go to [excalimate.com](https://excalimate.com) in your browser and click **📡 Live** in the toolbar. The app connects to `localhost:3001` automatically.

### Step 3: Connect your AI

Point your AI tool to `http://localhost:3001/mcp` as an MCP server. Then ask it to create a diagram and animate it — you'll see elements appear and animate in your browser in real-time.

**That's it.** The AI draws and animates, you see it live, and you can edit alongside it.

## Features

- **22 tools** for scene creation, animation, camera control, export, and checkpointing
- **Dual transport**: stdio (Claude Desktop) + Streamable HTTP (cloud deployment)
- **Live preview**: Real-time updates in [excalimate.com](https://excalimate.com) via SSE
- **Sequence reveal**: Staggered element reveal animations in one tool call
- **Camera animation**: Pan/zoom keyframes for cinematic effects
- **Checkpoint persistence**: Save/load complete scene + animation state

## Installation & Usage

### HTTP mode (recommended — enables live preview)

```bash
npx @excalimate/mcp-server
# → http://localhost:3001/mcp
```

Open [excalimate.com](https://excalimate.com) and click **📡 Live**, then configure your AI tool below.

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
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

Start the MCP server first (`npx @excalimate/mcp-server`), open [excalimate.com](https://excalimate.com), click **📡 Live**, then ask Copilot to create a diagram. You'll see it appear in real-time.

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

Claude Desktop uses stdio transport, so there's no live preview. The AI creates scenes and animations, then use `save_checkpoint` to save state and load it in [excalimate.com](https://excalimate.com) via the **MCP** button in the toolbar.

</details>

<details>
<summary><strong>Claude Code (CLI) — ✅ live preview</strong></summary>

Claude Code supports HTTP MCP servers. Start the server first, then add it:

```bash
npx @excalimate/mcp-server &
claude mcp add excalimate http://localhost:3001/mcp
```

Open [excalimate.com](https://excalimate.com) and click **📡 Live** — you'll see the AI's changes in real-time.

</details>

<details>
<summary><strong>Cursor — ✅ live preview</strong></summary>

In Cursor settings, go to **MCP Servers** and add:

- **Name:** `excalimate`
- **Type:** `http`
- **URL:** `http://localhost:3001/mcp`

Start the MCP server (`npx @excalimate/mcp-server`), open [excalimate.com](https://excalimate.com), click **📡 Live**, then use Cursor's agent to create diagrams with live preview.

</details>

<details>
<summary><strong>Windsurf — ✅ live preview</strong></summary>

Add to your Windsurf MCP config:

```json
{
  "mcpServers": {
    "excalimate": {
      "serverUrl": "http://localhost:3001/mcp"
    }
  }
}
```

Start the MCP server, open [excalimate.com](https://excalimate.com), click **📡 Live**, and use Cascade to create animated diagrams in real-time.

</details>

<details>
<summary><strong>Any HTTP-compatible MCP client — ✅ live preview</strong></summary>

Point your MCP client to:

```
http://localhost:3001/mcp
```

Start the server with `npx @excalimate/mcp-server`, open [excalimate.com](https://excalimate.com), and click **📡 Live**. Any tool that supports Streamable HTTP MCP transport will work with live preview.

</details>

> **Tip:** HTTP mode (the default) is always preferred — it enables live preview so you can watch the AI build your animation in real-time. stdio mode is only needed for tools that don't support HTTP transport (like Claude Desktop).

### From source (for development)

```bash
cd mcp-server
npm install
npm run build
node dist/index.js          # HTTP mode
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

### Inspection Tools
| Tool | Description |
|------|-------------|
| `are_items_in_line` | Check horizontal/vertical alignment |
| `is_camera_centered` | Check if camera is centered on content |
| `items_visible_in_camera` | Report visibility of items at a given time |
| `animations_of_item` | Describe all animations of an element |

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
```
