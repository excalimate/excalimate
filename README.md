# Excalimate

Create keyframe animations from Excalidraw designs. Draw diagrams with the full Excalidraw editor, then animate elements with opacity fades, position slides, scale effects, rotation, and arrow draw-on animations. Export as MP4, WebM, GIF, or animated SVG.

Includes an **MCP server** for AI-driven animation — let Copilot, Claude or other AI agents create and animate diagrams in real-time.

**Try it now:** Open [excalimate.com](https://excalimate.com), install the MCP server with `npx @excalimate/mcp-server`, and let your AI create animated diagrams while you watch live.

## Features

- **Full Excalidraw editor** — draw, edit, resize, connect arrows, add text — everything Excalidraw does
- **Keyframe animation** — opacity, position, scale, rotation, draw progress (for arrows/lines)
- **Timeline** — collapsible per-element tracks, clip start/end markers, scrubbing
- **Sequence reveal** — stagger-reveal multiple elements with one click
- **Camera frame** — pan/zoom animation, aspect ratio control
- **Export** — MP4 (H.264), WebM (VP9), GIF, animated SVG
- **E2E encrypted sharing** — share via URL, encryption key stays in the hash fragment
- **MCP server** — AI agents can create scenes, animate them, and preview in real-time
- **Live mode** — see AI changes in the editor as they happen via SSE

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:5173` in your browser.

### With AI (MCP Server)

```bash
# Run the MCP server directly from npm
npx @excalimate/mcp-server
```

Then open [excalimate.com](https://excalimate.com) and click **📡 Live** in the toolbar. See [AI Animation with MCP Server](#ai-animation-with-mcp-server) below for the full guide.

## Usage

### Edit Mode
Draw your diagram using the Excalidraw editor. All standard tools work — rectangles, ellipses, arrows, text, groups, etc.

### Animate Mode
Switch to Animate mode (Ctrl+E) to:
1. Select elements and modify properties in the right panel — keyframes are created automatically
2. Use the timeline to scrub, move keyframes, and set clip range
3. Click **🎬 Sequence** to create staggered reveal animations
4. Click **Export** to render as video

### AI Animation with MCP Server

The MCP server lets AI agents (Copilot, Claude, etc.) create and animate diagrams for you. The easiest way to get started is to pair the **deployed web app** at [excalimate.com](https://excalimate.com) with the MCP server from npm.

#### 1. Start the MCP server

```bash
npx @excalimate/mcp-server
# → MCP server running at http://localhost:3001
```

Or install it globally:

```bash
npm install -g @excalimate/mcp-server
excalimate-mcp
```

#### 2. Open the web app

Go to [excalimate.com](https://excalimate.com) and click **📡 Live** in the toolbar. The app connects to your local MCP server automatically.

#### 3. Connect your AI tool

Pick your tool below. **HTTP mode** is recommended — it enables real-time live preview in [excalimate.com](https://excalimate.com) while the AI works.

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

See [mcp-server/README.md](mcp-server/README.md) for full documentation and [mcp-server/SKILL.md](mcp-server/SKILL.md) for the AI skill guide.

## Architecture

```
excalimate/
├── src/                    # React web app (Vite + TypeScript)
│   ├── components/         # UI components (Toolbar, Timeline, PropertyPanel, etc.)
│   ├── core/               # Animation engine, interpolation, playback
│   ├── stores/             # Zustand state (project, animation, UI, undo/redo)
│   ├── services/           # Export pipeline, file I/O, encryption
│   └── hooks/              # Custom hooks (hotkeys, MCP live)
├── mcp-server/             # MCP server (Node.js + TypeScript)
│   ├── src/                # Server, tools, state, checkpoints
│   ├── SKILL.md            # AI skill guide
│   └── references/         # Detailed reference docs
└── public/                 # Static assets
```

**Key design**: The web app is a **static SPA** — all rendering, animation, and editing happens in the browser. No server needed for core functionality. The MCP server is optional (for AI integration and live preview).

## Security

- **Client-side only** — core app stores nothing server-side
- **E2E encrypted sharing** — AES-128-GCM encryption, key in URL hash (never sent to server)
- **Export** — all rendering happens in-browser via WebCodecs/Canvas
- **MCP server** — designed for local use; needs authentication if exposed to internet

## Development

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run test         # Run tests (280 tests)
npm run lint         # ESLint
```

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes with tests
4. Open a pull request

## Acknowledgements

This project was inspired by [excalidraw-animate](https://github.com/dai-shi/excalidraw-animate) by [Daishi Kato](https://github.com/dai-shi), which demonstrated that Excalidraw drawings could be brought to life with animations. Thank you for the inspiration!

Built with [Excalidraw](https://excalidraw.com) — the amazing open-source virtual whiteboard.

## License

MIT — see [LICENSE](LICENSE)
