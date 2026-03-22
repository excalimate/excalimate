import { ActionIcon, Tooltip } from '@mantine/core';
import { IconSun, IconMoon } from '@tabler/icons-react';
import { useUIStore } from '../../stores/uiStore';
import { trackThemeToggle } from '../../services/analytics/posthog';

export function ThemeToggle() {
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  return (
    <Tooltip label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
      <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => { const newTheme = theme === 'dark' ? 'light' : 'dark'; toggleTheme(); trackThemeToggle(newTheme); }}>
        {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
      </ActionIcon>
    </Tooltip>
  );
}
