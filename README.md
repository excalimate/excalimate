<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/excalimate_logo_dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="public/excalimate_logo.svg">
    <img src="public/excalimate_logo.svg" width="280" alt="Excalimate">
  </picture>

  *Turn hand-drawn Excalidraw diagrams into keyframe animations*

  [![npm version](https://img.shields.io/npm/v/@excalimate/mcp-server?style=flat-square)](https://www.npmjs.com/package/@excalimate/mcp-server)
  [![npm downloads](https://img.shields.io/npm/dm/@excalimate/mcp-server?style=flat-square)](https://www.npmjs.com/package/@excalimate/mcp-server)
  [![license](https://img.shields.io/github/license/excalimate/excalimate?style=flat-square)](LICENSE)
  [![GitHub stars](https://img.shields.io/github/stars/excalimate/excalimate?style=flat-square)](https://github.com/excalimate/excalimate)

  [Website](https://excalimate.com) · [MCP Server Docs](mcp-server/README.md) · [Report Bug](https://github.com/excalimate/excalimate/issues)

</div>

Draw diagrams with the full Excalidraw editor, then animate elements with opacity fades, position slides, scale effects, rotation, and arrow draw-on animations. Export as MP4, WebM, GIF, or animated SVG. Includes an **MCP server** so AI agents can create and animate diagrams in real-time.


## Demo

https://github.com/user-attachments/assets/77e87c62-0ff4-4a56-aee6-50553b94798c


> [!CAUTION]
> A considerable part of this codebase was built with AI. The process of cleaning up the code and fixing bugs is still ongoing — use it cautiously. If you encounter any issues, please [report them](https://github.com/excalimate/excalimate/issues).

## Features

- **Full Excalidraw editor** — draw, edit, resize, connect arrows, add text
- **Keyframe animation** — opacity, position, scale, rotation, draw progress
- **Timeline** — collapsible per-element tracks with interpolation lines, clip markers, scrubbing
- **Sequence reveal** — stagger-reveal multiple elements with one click
- **Camera animation** — pan/zoom keyframes with aspect ratio control
- **Export** — MP4 (H.264), WebM (VP9), GIF, animated SVG
- **E2E encrypted sharing** — AES-256-GCM, key stays in the URL hash fragment
- **MCP server** — 23 tools for AI-driven scene creation, animation, and sharing
- **Live mode** — watch AI changes appear in the editor in real-time via SSE

## Quick Start

**Try it now** — no cloning required:

```bash
npx @excalimate/mcp-server
```

Open [excalimate.com](https://excalimate.com), click the **Live** button, and point your AI tool to `http://localhost:3001/mcp`.

### Local development

```bash
npm install
npm run dev
# → http://localhost:5173
```

## AI Integration (MCP Server)

The MCP server lets AI agents (Copilot, Claude, Cursor, Windsurf) create and animate diagrams for you. Start the server, connect your AI tool, and watch diagrams appear live in [excalimate.com](https://excalimate.com).

```bash
npx @excalimate/mcp-server              # default port 3001
npx @excalimate/mcp-server --port 4000  # custom port
```

<details>
<summary><strong>VS Code (GitHub Copilot)</strong></summary>

Add to `.vscode/mcp.json`:

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

</details>

<details>
<summary><strong>Claude Desktop</strong></summary>

Add to `claude_desktop_config.json`:

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

> [!NOTE]
> Claude Desktop uses stdio transport — no live preview. Use `save_checkpoint` or `share_project` to view results in [excalimate.com](https://excalimate.com).

</details>

<details>
<summary><strong>Claude Code (CLI)</strong></summary>

```bash
npx @excalimate/mcp-server &
claude mcp add excalimate http://localhost:3001/mcp
```

</details>

<details>
<summary><strong>Cursor / Windsurf / Other HTTP clients</strong></summary>

Point your MCP client to `http://localhost:3001/mcp` and start the server with `npx @excalimate/mcp-server`.

</details>

> [!TIP]
> HTTP mode (default) enables **live preview** — you see the AI's changes in real-time. stdio mode is only needed for tools that don't support HTTP transport.

See [mcp-server/README.md](mcp-server/README.md) for the full tool reference and configuration guide.

### AI Skills (Optional)

Excalimate ships with **16 specialized skills** that teach AI agents how to create specific diagram types (architecture diagrams, flowcharts, sequence diagrams, etc.) with proper animation patterns. Skills dramatically improve output quality.

**GitHub Copilot (recommended):**

```bash
npx skills add https://github.com/excalimate/excalimate
```

**Manual installation (any agent):**

Copy the `skills/` directory into your project, or point your agent's skill/context configuration to the skill files. Each skill is a standalone `SKILL.md` file that can be loaded as context.

**Available skills:** `excalimate-core` · `animated-presentations` · `animation-patterns` · `architecture-diagrams` · `comparison-diagrams` · `data-pipelines` · `diagram-theming` · `er-diagrams` · `explainer-animations` · `export-optimization` · `flowcharts` · `mind-maps` · `network-topologies` · `org-charts` · `sequence-diagrams` · `timeline-roadmaps`

## Usage

### Edit Mode

Draw your diagram using the Excalidraw editor. All standard tools work — rectangles, ellipses, arrows, text, groups, etc.

### Animate Mode

Switch to Animate mode (`Ctrl+E`) to:
1. Select elements and modify properties — keyframes are created automatically
2. Scrub the timeline, move keyframes, and set the clip range
3. Use **Sequence Reveal** for staggered element animations
4. Export to MP4, WebM, GIF, or animated SVG

### Sharing

Share your animation via **File → Share**. The project is encrypted client-side with AES-256-GCM and uploaded as an opaque blob — the server never sees the encryption key.

## Architecture

```
excalimate/
├── src/                        # React web app (Vite + TypeScript)
│   ├── components/             # UI (Mantine + Tailwind CSS)
│   ├── core/                   # Animation engine, interpolation, playback
│   ├── stores/                 # Zustand state management
│   ├── services/               # Export pipeline, encryption, file I/O
│   └── hooks/                  # MCP live, hotkeys, auto-save
├── mcp-server/                 # MCP server (Node.js + Express)
│   └── src/server/             # Modular tool registrations
├── skills/                     # AI skill definitions (16 skills)
└── docs/                       # Design guidelines, plans
```

The web app is a **static SPA** — all rendering, animation, and editing happens in the browser. The MCP server is optional, used only for AI integration and live preview.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 19, Mantine 8, Tailwind CSS 4, Tabler Icons |
| Canvas | Excalidraw 0.18 |
| State | Zustand |
| Animation | Custom keyframe engine with interpolation + easing |
| Export | WebCodecs (MP4/WebM), gif.js, SVG |
| Encryption | Web Crypto API (AES-256-GCM) |
| MCP Server | Node.js, Express, MCP SDK |
| Build | Vite 7, TypeScript 5.9 |
| Deployment | Cloudflare Pages |

## Development

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run test         # Run tests
npm run lint         # ESLint
```

MCP server:

```bash
cd mcp-server
npm install && npm run build
node dist/index.js              # HTTP mode
node dist/index.js --stdio      # stdio mode
node dist/index.js --port 4000  # custom port
```

## Acknowledgements

This project was inspired by [excalidraw-animate](https://github.com/dai-shi/excalidraw-animate) by [Daishi Kato](https://github.com/dai-shi), which demonstrated that Excalidraw drawings could be brought to life with animations. Thank you for the inspiration!

Built with [Excalidraw](https://excalidraw.com) — the amazing open-source virtual whiteboard.

## License

MIT — see [LICENSE](LICENSE)
