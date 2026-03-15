# Excalimate

## Component Library

This project uses **Mantine** as its UI component library. Use Mantine components instead of raw HTML elements or custom primitives.

Refer to `docs/mantine-library.md` for the full Mantine API reference, available components, theming, and usage patterns. Always consult this file before implementing or suggesting UI changes.

## Icons

This project uses **@tabler/icons-react** exclusively for all icons. No other icon libraries and no emojis.

- Import icons from `@tabler/icons-react` (e.g., `import { IconPlayerPlay, IconKeyframe } from '@tabler/icons-react'`).
- Use Tabler icon components with consistent sizing via the `size` prop.
- Never use emoji characters, Unicode symbols, or other icon libraries for UI icons.

## Coding Conventions

- TypeScript with strict types. Avoid `any` where possible.
- React functional components with hooks. No class components.
- Zustand for state management (`src/stores/`). Use selectors to avoid unnecessary re-renders.
- Mantine styling system + Tailwind CSS for utility classes.
- Modular file structure: hooks extracted from components, pure logic separated from UI.
- Run `npx eslint` on changed files before committing.
- Notifications: use Mantine `notifications.show()` for user feedback. Notifications render in the bottom-right corner.
- Hotkeys: use Mantine `useHotkeys` from `@mantine/hooks` for all keyboard shortcuts. Register app-wide hotkeys in `src/hooks/useAppHotkeys.ts`.
- MCP server (`mcp-server/src/`) uses ESM with `.js` import extensions.
