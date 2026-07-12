import { useEffect, useState } from 'react';
import { ActionIcon, Popover, Stack, Text, Group, Tooltip } from '@mantine/core';
import {
  IconBrandGithub,
  IconBrandX,
  IconBrandBluesky,
  IconHeart,
  IconShieldLock,
} from '@tabler/icons-react';
import { readPreference, storePreference } from '../../services/analytics/consent';
import { OPTIONAL_STORAGE_KEYS } from '../../services/privacy/dataInventory';
import { useConsentStore } from '../../stores/consentStore';

const REPO = 'excalimate/excalimate';
const GITHUB_URL = `https://github.com/${REPO}`;
const STARS_KEY = OPTIONAL_STORAGE_KEYS.githubStars;

function getCachedStars(): number | null {
  try {
    const raw = readPreference(STARS_KEY);
    if (!raw) return null;
    const { count, ts } = JSON.parse(raw);
    // Cache for 1 hour
    if (Date.now() - ts < 3600000) return count;
  } catch {
    /* ignore */
  }
  return null;
}

function cacheStars(count: number): void {
  storePreference(STARS_KEY, JSON.stringify({ count, ts: Date.now() }));
}

export function InfoLinks() {
  const [stars, setStars] = useState<number | null>(getCachedStars);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const openPrivacySettings = useConsentStore((state) => state.openSettings);

  useEffect(() => {
    if (stars !== null) return;
    fetch(`https://api.github.com/repos/${REPO}`, { signal: AbortSignal.timeout(5000) })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.stargazers_count != null) {
          setStars(data.stargazers_count);
          cacheStars(data.stargazers_count);
        }
      })
      .catch(() => {
        /* best effort */
      });
  }, [stars]);

  return (
    <>
      <div className="w-px h-5 bg-border mx-1" />

      {/* GitHub link with star count */}
      <Tooltip label="GitHub repository">
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-text-muted hover:text-text transition-colors"
        >
          <IconBrandGithub size={16} />
          {stars !== null && (
            <span className="text-[11px]">
              {stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : stars}
            </span>
          )}
        </a>
      </Tooltip>

      <Tooltip label="Privacy and data">
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          onClick={openPrivacySettings}
          aria-label="Privacy and data"
        >
          <IconShieldLock size={15} />
        </ActionIcon>
      </Tooltip>

      {/* Credits popover */}
      <Popover
        opened={popoverOpen}
        onChange={setPopoverOpen}
        position="bottom-end"
        shadow="md"
        width={220}
      >
        <Popover.Target>
          <Tooltip label="About">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={() => setPopoverOpen((o) => !o)}
            >
              <IconHeart size={15} />
            </ActionIcon>
          </Tooltip>
        </Popover.Target>
        <Popover.Dropdown>
          <Stack gap="sm">
            <Text size="xs" ta="center" c="dimmed">
              Made by David Szakacs
            </Text>
            <Group justify="center" gap="xs">
              <Tooltip label="X / Twitter">
                <ActionIcon
                  component="a"
                  href="https://x.com/thedavidszakacs"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="subtle"
                  color="gray"
                  size="sm"
                >
                  <IconBrandX size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Bluesky">
                <ActionIcon
                  component="a"
                  href="https://bsky.app/profile/davidszakacs.bsky.social"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="subtle"
                  color="gray"
                  size="sm"
                >
                  <IconBrandBluesky size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="GitHub">
                <ActionIcon
                  component="a"
                  href="https://github.com/davidszakacs"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="subtle"
                  color="gray"
                  size="sm"
                >
                  <IconBrandGithub size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Stack>
        </Popover.Dropdown>
      </Popover>
    </>
  );
}
