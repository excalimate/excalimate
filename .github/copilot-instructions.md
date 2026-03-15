# Copilot Instructions for Excalimate

## Component Library

This project uses **Mantine** as its UI component library. When building or modifying UI components:

- Use Mantine components (`Button`, `TextInput`, `Select`, `Modal`, `Tabs`, `Slider`, etc.) instead of raw HTML elements or custom primitives.
- Refer to `docs/mantine-library.md` for the full API reference, available components, theming, and usage patterns.
- Follow the existing Mantine theme configuration for colors, spacing, and typography.

## Icons

This project uses **@tabler/icons-react** exclusively for all icons. No other icon libraries and no emojis.

- Import icons from `@tabler/icons-react` (e.g., `import { IconPlayerPlay, IconKeyframe } from '@tabler/icons-react'`).
- Use Tabler icon components with consistent sizing via the `size` prop.
- Never use emoji characters, Unicode symbols, or other icon libraries for UI icons.

## Key References

| Document                  | Purpose                                                 |
| ------------------------- | ------------------------------------------------------- |
| `docs/mantine-library.md` | Mantine component library API reference and usage guide |

## Coding Conventions

- **TypeScript** — strict types, avoid `any` where possible.
- **React** — functional components with hooks. No class components.
- **State management** — Zustand stores in `src/stores/`. Use selectors to avoid unnecessary re-renders.
- **Styling** — Mantine's built-in styling system + Tailwind CSS for utility classes.
- **File structure** — follow the modular decomposition pattern (hooks extracted from components, pure logic separated from UI).
- **Linting** — run `npx eslint` on changed files before committing.
- **Notifications** — use Mantine `notifications.show()` for user feedback. Notifications render in the bottom-right corner.
- **Hotkeys** — use Mantine `useHotkeys` from `@mantine/hooks` for all keyboard shortcuts. Register app-wide hotkeys in `src/hooks/useAppHotkeys.ts`.
- **MCP Server** — `mcp-server/src/` uses ESM with `.js` import extensions.
