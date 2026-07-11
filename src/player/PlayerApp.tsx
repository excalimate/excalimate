import {
  ActionIcon,
  Alert,
  Anchor,
  AspectRatio,
  Box,
  Center,
  Group,
  Loader,
  Paper,
  Select,
  Slider,
  Stack,
  Text,
} from '@mantine/core';
import { useHotkeys, useReducedMotion } from '@mantine/hooks';
import {
  IconAlertTriangle,
  IconMaximize,
  IconMinimize,
  IconPlayerPause,
  IconPlayerPlay,
  IconReload,
} from '@tabler/icons-react';
import {
  PlayerRuntime,
  createPlayerMessageBridge,
  parseAllowedOrigins,
} from '@excalimate/player-runtime';
import type {
  PlayerPackageV1,
  PlayerState,
} from '@excalimate/player-runtime';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  loadHostedPlayer,
} from './loadHostedPlayer';
import type {
  HostedPlayerLoadResult,
} from './loadHostedPlayer';

const INITIAL_STATE: PlayerState = {
  currentTimeMs: 0,
  durationMs: 0,
  rate: 1,
  playing: false,
  ended: false,
};
const RATES = ['0.25', '0.5', '1', '1.5', '2', '3', '4'];

export interface PlayerAppProps {
  load?: () => Promise<HostedPlayerLoadResult>;
  reducedMotionOverride?: boolean;
}

export function PlayerApp({
  load = loadHostedPlayer,
  reducedMotionOverride,
}: PlayerAppProps) {
  const detectedReducedMotion = useReducedMotion();
  const reducedMotion = reducedMotionOverride ?? detectedReducedMotion;
  const rootRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerRuntime | null>(null);
  const [playerPackage, setPlayerPackage] = useState<PlayerPackageV1 | null>(null);
  const [state, setState] = useState<PlayerState>(INITIAL_STATE);
  const [status, setStatus] = useState<'loading' | 'ready' | 'legacy' | 'error'>(
    'loading',
  );
  const [editorUrl, setEditorUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    let active = true;
    void load()
      .then((result) => {
        if (!active) return;
        setEditorUrl(result.editorUrl);
        if (result.kind === 'legacy') {
          setStatus('legacy');
          return;
        }
        setPlayerPackage(result.playerPackage);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'The shared animation could not be loaded',
        );
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [load]);

  useEffect(() => {
    if (!playerPackage || !sceneRef.current) return;
    let active = true;
    let player: PlayerRuntime | null = null;
    let unsubscribe = (): void => {};
    let destroyBridge = (): void => {};
    const scene = sceneRef.current;
    queueMicrotask(() => {
      if (!active) return;
      try {
        player = new PlayerRuntime(playerPackage, { container: scene });
        playerRef.current = player;
        unsubscribe = player.subscribe((nextState) => {
          setState({ ...nextState });
        });
        const allowedOrigins = parseAllowedOrigins(
          import.meta.env.VITE_PLAYER_ALLOWED_ORIGINS,
        );
        if (allowedOrigins.length > 0) {
          destroyBridge = createPlayerMessageBridge(player, { allowedOrigins });
        }
        setStatus('ready');
      } catch (runtimeError) {
        destroyBridge();
        unsubscribe();
        player?.destroy();
        playerRef.current = null;
        setError(
          runtimeError instanceof Error
            ? runtimeError.message
            : 'The animation package is invalid',
        );
        setStatus('error');
      }
    });

    return () => {
      active = false;
      destroyBridge();
      unsubscribe();
      player?.destroy();
      playerRef.current = null;
    };
  }, [playerPackage]);

  useEffect(() => {
    const onFullscreenChange = (): void => {
      setFullscreen(document.fullscreenElement === rootRef.current);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const togglePlayback = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (player.getState().playing) player.pause();
    else player.play();
  }, []);
  const seekBy = useCallback((delta: number) => {
    const player = playerRef.current;
    if (!player || focusedSlider()) return;
    player.seek(player.getState().currentTimeMs + delta);
  }, []);
  const seekTo = useCallback((timeMs: number) => {
    playerRef.current?.seek(timeMs);
  }, []);

  useHotkeys(
    [
      ['Space', togglePlayback],
      ['ArrowLeft', () => seekBy(-5_000)],
      ['ArrowRight', () => seekBy(5_000)],
      ['Home', () => seekTo(0)],
      ['End', () => seekTo(playerRef.current?.getState().durationMs ?? 0)],
    ],
    ['INPUT', 'TEXTAREA', 'SELECT'],
  );

  const canFullscreen =
    typeof document !== 'undefined' &&
    document.fullscreenEnabled &&
    typeof HTMLElement.prototype.requestFullscreen === 'function';
  const toggleFullscreen = async (): Promise<void> => {
    if (!rootRef.current || !canFullscreen) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await rootRef.current.requestFullscreen();
  };
  const aspectRatio = useMemo(
    () =>
      playerPackage
        ? playerPackage.dimensions.width / playerPackage.dimensions.height
        : 16 / 9,
    [playerPackage],
  );

  return (
    <Box component="main" ref={rootRef} className="player-shell">
      <Paper className="player-card" radius="md" shadow="xl">
        <AspectRatio ratio={aspectRatio} className="player-viewport">
          <Box ref={sceneRef} className="player-scene" aria-label="Animation scene" />
        </AspectRatio>

        {status === 'loading' && (
          <Center className="player-overlay" aria-live="polite">
            <Stack align="center" gap="xs">
              <Loader color="indigo" />
              <Text size="sm">Loading encrypted animation</Text>
            </Stack>
          </Center>
        )}

        {(status === 'error' || status === 'legacy') && (
          <Center className="player-overlay">
            <Alert
              icon={<IconAlertTriangle size={20} />}
              color={status === 'error' ? 'red' : 'yellow'}
              title={
                status === 'legacy'
                  ? 'This is a legacy share'
                  : 'Unable to play animation'
              }
              role="alert"
              aria-live="assertive"
              className="player-alert"
            >
              <Stack gap="sm">
                <Text size="sm">
                  {status === 'legacy'
                    ? 'This share does not include a hosted-player package.'
                    : error}
                </Text>
                {editorUrl && (
                  <Anchor href={editorUrl} fw={600}>
                    Open in Excalimate
                  </Anchor>
                )}
              </Stack>
            </Alert>
          </Center>
        )}

        {status === 'ready' && (
          <Stack gap="xs" className="player-controls" aria-label="Player controls">
            <Group gap="sm" wrap="nowrap" className="player-scrubber-row">
              <Text size="xs" ff="monospace" className="player-time">
                {formatTime(state.currentTimeMs)}
              </Text>
              <Slider
                className="player-scrubber"
                min={0}
                max={Math.max(1, state.durationMs)}
                value={state.currentTimeMs}
                onChange={seekTo}
                label={formatTime}
                thumbLabel="Animation position"
              />
              <Text size="xs" ff="monospace" className="player-time">
                {formatTime(state.durationMs)}
              </Text>
            </Group>
            <Group justify="space-between" gap="sm" wrap="nowrap">
              <Group gap="xs" wrap="nowrap">
                <ActionIcon
                  size={44}
                  radius="xl"
                  color="indigo"
                  onClick={togglePlayback}
                  aria-label={
                    state.playing
                      ? 'Pause animation'
                      : state.ended
                        ? 'Replay animation'
                        : 'Play animation'
                  }
                >
                  {state.playing ? (
                    <IconPlayerPause size={22} />
                  ) : state.ended ? (
                    <IconReload size={22} />
                  ) : (
                    <IconPlayerPlay size={22} />
                  )}
                </ActionIcon>
                <Select
                  className="player-rate"
                  size="xs"
                  aria-label="Playback rate"
                  value={String(state.rate)}
                  allowDeselect={false}
                  data={RATES.map((rate) => ({
                    value: rate,
                    label: `${rate}x`,
                  }))}
                  onChange={(rate) => {
                    if (rate) playerRef.current?.setRate(Number(rate));
                  }}
                />
                {reducedMotion && (
                  <Text size="xs" c="dimmed" className="player-reduced-motion">
                    Reduced motion: playback starts paused
                  </Text>
                )}
              </Group>
              <Group gap="xs" wrap="nowrap">
                {canFullscreen && (
                  <ActionIcon
                    size={44}
                    variant="subtle"
                    color="gray"
                    onClick={() => void toggleFullscreen()}
                    aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  >
                    {fullscreen ? (
                      <IconMinimize size={21} />
                    ) : (
                      <IconMaximize size={21} />
                    )}
                  </ActionIcon>
                )}
                <Anchor
                  href={playerPackage?.attribution.url}
                  target="_blank"
                  rel="noreferrer"
                  size="xs"
                  c="dimmed"
                  className="player-attribution"
                >
                  {playerPackage?.attribution.label}
                </Anchor>
              </Group>
            </Group>
          </Stack>
        )}
      </Paper>
    </Box>
  );
}

function formatTime(milliseconds: number): string {
  const totalSeconds = Math.max(0, milliseconds) / 1_000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`;
}

function focusedSlider(): boolean {
  return document.activeElement?.getAttribute('role') === 'slider';
}
