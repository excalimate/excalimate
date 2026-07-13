<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/excalimate_logo_dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="public/excalimate_logo.svg">
    <img src="public/excalimate_logo.svg" width="280" alt="Excalimate">
  </picture>

_Turn hand-drawn Excalidraw diagrams into keyframe animations_

[![npm version](https://img.shields.io/npm/v/@excalimate/mcp-server?style=flat-square)](https://www.npmjs.com/package/@excalimate/mcp-server)
[![npm downloads](https://img.shields.io/npm/dm/@excalimate/mcp-server?style=flat-square)](https://www.npmjs.com/package/@excalimate/mcp-server)
[![license](https://img.shields.io/github/license/excalimate/excalimate?style=flat-square)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/excalimate/excalimate?style=flat-square)](https://github.com/excalimate/excalimate)

[App](https://app.excalimate.com) · [Landing Page](https://excalimate.com) · [Feedback](https://excalimate.com/feedback) · [MCP Server Docs](mcp-server/README.md) · [Report Bug](https://github.com/excalimate/excalimate/issues)

</div>

Draw diagrams with the full Excalidraw editor, then animate elements with opacity fades, position slides, scale effects, rotation, and arrow draw-on animations. Export as MP4, WebM, GIF, or animated SVG. Includes an **MCP server** so AI agents can create and animate diagrams in real-time.

[![@excalimate/mcp-server MCP server](https://glama.ai/mcp/servers/excalimate/excalimate/badges/card.svg)](https://glama.ai/mcp/servers/excalimate/excalimate)

## Demo

https://github.com/user-attachments/assets/77e87c62-0ff4-4a56-aee6-50553b94798c

> [!CAUTION]
> A considerable part of this codebase was built with AI. The process of cleaning up the code and fixing bugs is still ongoing — use it cautiously. If you encounter any issues, please [report them](https://github.com/excalimate/excalimate/issues).

## Features

- **Full Excalidraw editor** — draw, edit, resize, connect arrows, add text
- **Progressive V2 creator** — Magic Canvas, plain-language Sequence, and Advanced Studio
- **Local animation tools** — deterministic Auto Animate, presets, templates, and Smart Transitions
- **Keyframe animation** — opacity, position, scale, rotation, draw progress
- **Advanced timeline** — collapsible per-element tracks with interpolation lines, clip markers, scrubbing
- **Camera animation** — pan/zoom keyframes with aspect ratio control
- **Unified export** — MP4, WebM, GIF, animated SVG, Lottie, and dotLottie
- **Hosted player and embeds** — compact playback runtime with responsive controls
- **E2E encrypted sharing** — expiry and revocation with the AES-256-GCM key kept in the URL hash
- **MCP server** — 35 tools, including all 29 legacy tools and six structured V2 action tools
- **Live mode** — watch AI changes appear in the editor in real-time via SSE

## Quick Start

**Try it now** — no cloning required:

```bash
npx @excalimate/mcp-server
```

Point your AI tool to `http://127.0.0.1:3001/mcp`. After it connects, copy the
printed preview pairing URL into **File → Preferences** in
[app.excalimate.com](https://app.excalimate.com), then click **Live**.

### Local development

```bash
npm install
npm run dev
# → http://localhost:5173
```

## AI Integration (MCP Server)

The MCP server lets AI agents (Copilot, Claude, Cursor, Windsurf) create and animate diagrams for you. Start the server, connect your AI tool, and watch diagrams appear live in [app.excalimate.com](https://app.excalimate.com).

The recommended workflow is action-first: create a scene, then use `auto_animate`, `apply_animation_preset`, `upsert_action_sequence`, or `create_camera_move` before reaching for raw keyframes. These tools use the same browser-neutral V2 schema and deterministic animation core as the app stack. The MCP server does not host a model or send scene content to an AI service.

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
      "url": "http://localhost:3001/mcp",
    },
  },
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
> Claude Desktop uses stdio transport — no live preview. Use `save_checkpoint`, import the V2 project in [app.excalimate.com](https://app.excalimate.com), then share from the authenticated browser UI.

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

### V2 creator workflow

1. Draw with the full Excalidraw editor or start from an animated template.
2. Use **Magic** to preview local Auto Animate, apply a preset, or create a Smart Transition between captured scene states.
3. Use **Sequence** to reorder actions and adjust plain-language timing such as after or with the previous action.
4. Open **Studio** for the preserved advanced timeline, custom keyframes, clip range, camera, and per-track controls.
5. Export a video, image, animated SVG, Lottie, or dotLottie, or create an encrypted expiring share link for hosted playback.

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
├── packages/
│   ├── project-schema/         # Shared V2 project codec and validation
│   ├── animation-core/         # Shared deterministic action compiler/runtime
│   ├── player-runtime/         # Hosted player package, sanitizer, playback
│   └── export-runtime/         # Unified export sampling and workers
├── skills/                     # AI skill definitions (16 skills)
└── docs/                       # Design guidelines, plans
```

The web app is a **static SPA** — all rendering, animation, and editing happens in the browser. The MCP server is optional, used only for AI integration and live preview.

## Excalimate V2 documentation

- [Migration, architecture, limits, rollout, and rollback](docs/v2-release.md)
- [Magic, Sequence, Studio, templates, and transitions](docs/v2-user-guide.md)
- [Hosted player and embedding](docs/hosted-player.md)
- [MCP V2 and deprecations](docs/mcp-v2.md)
- [Security, sharing retention, and deployment](docs/security-and-sharing.md)
- [Accessibility validation matrix](docs/accessibility.md)
- [Export runtime and format fallbacks](docs/export-runtime.md)

## Tech Stack

| Layer      | Technology                                          |
| ---------- | --------------------------------------------------- |
| UI         | React 19, Mantine 8, Tailwind CSS 4, Tabler Icons   |
| Canvas     | Excalidraw 0.18                                     |
| State      | Zustand                                             |
| Animation  | Custom keyframe engine with interpolation + easing  |
| Export     | WebCodecs (MP4/WebM), gif.js, SVG                   |
| Encryption | Web Crypto API (AES-256-GCM)                        |
| MCP Server | Node.js, Express, MCP SDK                           |
| Build      | Vite 7, TypeScript 5.9                              |
| Deployment | Cloudflare Pages, Cloudflare Workers, Cloudflare R2 |

## Development

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run test         # Run tests
npm run lint         # ESLint
```

### Privacy-sensitive deployment settings

The privacy notice depends on production configuration as well as source code:

- Configure the landing-page Cloudflare Workers build with root directory
  `landing-page`, build command `npm run build`, and deploy command
  `npx wrangler versions upload --config dist/server/wrangler.json`. The
  Cloudflare adapter generates that server configuration during the build.
- Use only Cloudflare edge/zone aggregate traffic analytics. Do not enable the
  Cloudflare Web Analytics browser beacon or export request logs for analytics.
- Do not describe or use Cloudflare's IP-derived unique-visitor metric as
  anonymous. Delete raw/exported Cloudflare reports within 30 days; aggregate
  trend reports may be retained without a fixed limit.
- Keep PostHog on Cloud EU with IP capture, autocapture, session replay, surveys,
  product tours, web experiments, and feature flags disabled. Set event retention
  to no more than 12 months and review the DPA and subprocessors before release.
- Retain the legitimate-interest and ePrivacy assessments for Cloudflare,
  GitHub's star-count request, and the pinned unpkg dotLottie runtime. Review the
  DPIA screening, Article 30 record, and any transfer assessment when a data flow
  changes.
- Obtain legal approval for the deployed notice and account settings. If the
  GitHub or unpkg request cannot rely on the documented ePrivacy position in a
  target jurisdiction, self-host/proxy it or gate it before release.

MCP server:

```bash
npm install
npm run build --workspace @excalimate/project-schema
npm run build --workspace @excalimate/animation-core
npm run build --workspace @excalimate/mcp-server
cd mcp-server
node dist/index.js              # HTTP mode
node dist/index.js --stdio      # stdio mode
node dist/index.js --port 4000  # custom port
```

## Acknowledgements

This project was inspired by [excalidraw-animate](https://github.com/dai-shi/excalidraw-animate) by [Daishi Kato](https://github.com/dai-shi), which demonstrated that Excalidraw drawings could be brought to life with animations. Thank you for the inspiration!

Built with [Excalidraw](https://excalidraw.com) — the amazing open-source virtual whiteboard.

## License

MIT — see [LICENSE](LICENSE)
