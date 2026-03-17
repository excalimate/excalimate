import { ActionIcon, CopyButton, Tooltip, Code, Text, Stack, Group } from '@mantine/core';
import {
  IconArrowLeft,
  IconCopy,
  IconCheck,
  IconTerminal2,
  IconBrandVscode,
  IconMessageChatbot,
  IconCursorText,
  IconBroadcast,
} from '@tabler/icons-react';
import { useUIStore } from '../../stores/uiStore';

const HANDWRITTEN = '"Virgil", "Segoe Print", "Comic Sans MS", cursive';

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div
      className="relative rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--color-border)' }}
    >
      {label && (
        <div
          className="px-3 py-1.5 text-[11px] uppercase tracking-wider font-semibold"
          style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text-muted)' }}
        >
          {label}
        </div>
      )}
      <div className="relative">
        <Code
          block
          className="text-sm"
          style={{ background: 'var(--color-surface)', borderRadius: 0 }}
        >
          {code}
        </Code>
        <div className="absolute top-2 right-2">
        <CopyButton value={code}>
          {({ copied, copy }) => (
            <Tooltip label={copied ? 'Copied' : 'Copy'}>
              <ActionIcon
                variant="subtle"
                color={copied ? 'green' : 'gray'}
                size="sm"
                onClick={copy}
              >
                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              </ActionIcon>
            </Tooltip>
          )}
        </CopyButton>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <Group gap="sm">
        <span style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>{icon}</span>
        <Text
          size="lg"
          fw={600}
          style={{ fontFamily: HANDWRITTEN, color: 'var(--color-text-muted)', opacity: 0.7 }}
        >
          {title}
        </Text>
      </Group>
      <div className="space-y-2 pl-1">
        {children}
      </div>
    </div>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <Text
      size="sm"
      style={{ color: 'var(--color-text-muted)', opacity: 0.65, lineHeight: 1.7 }}
    >
      {children}
    </Text>
  );
}

export function McpSetupGuide() {
  const theme = useUIStore((s) => s.theme);

  return (
    <div className="h-screen w-screen overflow-y-auto" style={{ background: 'var(--color-surface)' }}>
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Back button */}
        <button
          type="button"
          onClick={() => useUIStore.getState().setActivePage(null)}
          className="flex items-center gap-2 mb-8 text-text-muted hover:text-text transition-colors cursor-pointer"
          style={{ fontFamily: HANDWRITTEN, fontSize: '15px', opacity: 0.6 }}
        >
          <IconArrowLeft size={18} />
          Back to Excalimate
        </button>

        {/* Header */}
        <Stack gap="xs" align="center" mb="xl">
          <img
            src={theme === 'dark' ? '/excalimate_logo_dark.svg' : '/excalimate_logo.svg'}
            alt="Excalimate"
            className="h-10 opacity-80"
          />
          <Text
            size="xl"
            fw={600}
            ta="center"
            style={{ fontFamily: HANDWRITTEN, color: 'var(--color-text-muted)', opacity: 0.65 }}
          >
            MCP Server Setup Guide
          </Text>
          <Text
            size="sm"
            ta="center"
            style={{ color: 'var(--color-text-muted)', opacity: 0.5, fontFamily: HANDWRITTEN }}
          >
            Connect your AI coding assistant to Excalimate
          </Text>
        </Stack>

        <Stack gap="xl">
          {/* Step 1: Start the server */}
          <Section icon={<IconTerminal2 size={20} />} title="1. Start the MCP server">
            <Paragraph>
              Run the server with a single command. It starts in HTTP mode with live preview enabled by default.
            </Paragraph>
            <CodeBlock code="npx @excalimate/mcp-server" label="Terminal" />
            <Paragraph>
              The server will listen on <Code>http://localhost:3001/mcp</Code>. To use a custom port:
            </Paragraph>
            <CodeBlock code="npx @excalimate/mcp-server --port 4000" />
          </Section>

          {/* Step 2: Connect in Excalimate */}
          <Section icon={<IconBroadcast size={20} />} title="2. Connect in Excalimate">
            <Paragraph>
              Click the broadcast icon in the toolbar (top-right) to connect to the running server.
              Once connected, you'll see a live preview of everything the AI creates in real-time.
            </Paragraph>
            <Paragraph>
              You can configure the server URL in <strong>File → Preferences</strong>.
            </Paragraph>
          </Section>

          {/* Step 3: Configure your AI tool */}
          <Section icon={<IconMessageChatbot size={20} />} title="3. Configure your AI tool">
            <Paragraph>
              Add the MCP server to your AI coding assistant. Pick your tool below:
            </Paragraph>

            {/* VS Code */}
            <Group gap="xs" mt="sm">
              <IconBrandVscode size={16} style={{ color: 'var(--color-text-muted)', opacity: 0.6 }} />
              <Text size="sm" fw={600} style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                VS Code (GitHub Copilot)
              </Text>
            </Group>
            <Paragraph>
              Create <Code>.vscode/mcp.json</Code> in your project:
            </Paragraph>
            <CodeBlock
              label=".vscode/mcp.json"
              code={`{
  "servers": {
    "excalimate": {
      "type": "http",
      "url": "http://localhost:3001/mcp"
    }
  }
}`}
            />

            {/* Cursor */}
            <Group gap="xs" mt="sm">
              <IconCursorText size={16} style={{ color: 'var(--color-text-muted)', opacity: 0.6 }} />
              <Text size="sm" fw={600} style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                Cursor
              </Text>
            </Group>
            <Paragraph>
              Go to <strong>Settings → MCP Servers</strong>, then add:
            </Paragraph>
            <CodeBlock
              code={`Name: excalimate
Type: http
URL:  http://localhost:3001/mcp`}
            />

            {/* Claude Desktop */}
            <Group gap="xs" mt="sm">
              <IconMessageChatbot size={16} style={{ color: 'var(--color-text-muted)', opacity: 0.6 }} />
              <Text size="sm" fw={600} style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                Claude Desktop
              </Text>
            </Group>
            <Paragraph>
              Claude Desktop uses stdio mode (no live preview). Add to your <Code>claude_desktop_config.json</Code>:
            </Paragraph>
            <CodeBlock
              label="claude_desktop_config.json"
              code={`{
  "mcpServers": {
    "excalimate": {
      "command": "npx",
      "args": ["@excalimate/mcp-server", "--stdio"]
    }
  }
}`}
            />

            {/* Claude Code */}
            <Group gap="xs" mt="sm">
              <IconTerminal2 size={16} style={{ color: 'var(--color-text-muted)', opacity: 0.6 }} />
              <Text size="sm" fw={600} style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                Claude Code (CLI)
              </Text>
            </Group>
            <CodeBlock
              code={`npx @excalimate/mcp-server &
claude mcp add excalimate http://localhost:3001/mcp`}
            />

            {/* Windsurf */}
            <Group gap="xs" mt="sm">
              <IconTerminal2 size={16} style={{ color: 'var(--color-text-muted)', opacity: 0.6 }} />
              <Text size="sm" fw={600} style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                Windsurf
              </Text>
            </Group>
            <CodeBlock
              label="mcp_config.json"
              code={`{
  "mcpServers": {
    "excalimate": {
      "serverUrl": "http://localhost:3001/mcp"
    }
  }
}`}
            />
          </Section>

          {/* Done */}
          <div className="text-center pt-4 pb-8">
            <Text
              size="md"
              style={{ fontFamily: HANDWRITTEN, color: 'var(--color-text-muted)', opacity: 0.5 }}
            >
              That's it! Ask your AI to create diagrams and animations.
            </Text>
          </div>
        </Stack>
      </div>
    </div>
  );
}
