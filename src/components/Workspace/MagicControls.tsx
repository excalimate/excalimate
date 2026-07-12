import { useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  SegmentedControl,
  Select,
  Slider,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowRight,
  IconChartDots,
  IconCircleCheck,
  IconInfoCircle,
  IconLayoutBoard,
  IconListDetails,
  IconPlayerPlay,
  IconSparkles,
} from '@tabler/icons-react';
import type { AutoAnimateAnalysis, EasingType } from '@excalimate/animation-core';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import { applyPreset, applyPresetBatch } from '../../services/AnimationCommandService';
import { analyzeAutoAnimateInWorker } from '../../services/AutoAnimateService';
import { trackCreatorEvent } from '../../services/analytics/posthog';
import { SceneStateControls } from '../Transitions/SceneStateControls';

type Preset = 'fade' | 'slide' | 'draw' | 'pop';
type Direction = 'left' | 'right' | 'up' | 'down';

const EASING_OPTIONS: { value: EasingType; label: string }[] = [
  { value: 'easeOut', label: 'Gentle' },
  { value: 'easeInOut', label: 'Smooth' },
  { value: 'linear', label: 'Even' },
  { value: 'easeOutBack', label: 'Playful' },
];

function speedBand(speed: number): 'slow' | 'normal' | 'fast' {
  if (speed < 0.85) return 'slow';
  if (speed > 1.25) return 'fast';
  return 'normal';
}

function strategyLabel(strategy: AutoAnimateAnalysis['strategy']): string {
  switch (strategy) {
    case 'linear-left-to-right':
      return 'Left-to-right order';
    case 'linear-top-to-bottom':
      return 'Top-to-bottom order';
    case 'hierarchical':
      return 'Connected flow';
    case 'radial':
      return 'Center-out order';
    case 'timeline':
      return 'Timeline order';
    case 'stable-z-order':
      return 'Canvas order';
  }
}

export function MagicControls() {
  const project = useProjectStore((state) => state.project);
  const targets = useProjectStore((state) => state.targets);
  const targetIds = useMemo(() => targets.map((target) => target.id), [targets]);
  const selectedElementIds = useUIStore((state) => state.selectedElementIds);
  const [direction, setDirection] = useState<Direction>('left');
  const [speed, setSpeed] = useState(1);
  const [staggerMs, setStaggerMs] = useState(80);
  const [easing, setEasing] = useState<EasingType>('easeOut');
  const [analysis, setAnalysis] = useState<AutoAnimateAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const hasSelection = selectedElementIds.length > 0;

  const applySelectedPreset = (preset: Preset) => {
    if (!hasSelection) return;
    const commandPreset = preset === 'slide' ? `slide-${direction}` : preset;
    const result = applyPreset({
      preset: commandPreset,
      targetIds: selectedElementIds,
      timing: {
        startMs: 0,
        durationMs: Math.round(560 / speed),
        staggerMs,
        startMode: 'absolute',
      },
      easing,
    });
    if (!result.ok) {
      notifications.show({
        title: 'Preset was not applied',
        message: result.error.message,
        color: 'red',
      });
      return;
    }
    useUIStore.getState().setCanvasMode('preview');
    trackCreatorEvent('creator_preset_applied', {
      preset,
      ...(preset === 'slide' ? { direction } : {}),
      selection_size: selectedElementIds.length,
      speed_band: speedBand(speed),
    });
    notifications.show({
      title: 'Preset applied',
      message: `${preset.charAt(0).toUpperCase() + preset.slice(1)} was added as one undoable action.`,
      color: 'green',
      icon: <IconCircleCheck size={18} />,
    });
  };

  const previewAutoAnimate = async () => {
    const elements = project?.scene.elements;
    if (!elements || elements.length === 0) return;
    const scope = hasSelection ? 'selection' : 'diagram';
    try {
      setAnalyzing(true);
      const nextAnalysis = await analyzeAutoAnimateInWorker({
        elements,
        scope,
        ...(hasSelection ? { selectedElementIds } : {}),
      });
      setAnalysis(nextAnalysis);
      trackCreatorEvent('creator_auto_animate_previewed', {
        scope,
        strategy: nextAnalysis.strategy,
        confidence_band: nextAnalysis.confidenceBand,
        target_count: nextAnalysis.semanticTargets.length,
      });
    } catch (error) {
      console.error('Auto Animate analysis failed', error);
      notifications.show({
        title: 'Could not create an animation order',
        message: 'Try again, or choose an animation style below.',
        color: 'red',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const acceptAnalysis = () => {
    if (!analysis) return;
    const knownTargets = new Set(targetIds);
    const inputs = analysis.recipes
      .map((recipe) => ({
        preset: recipe.preset,
        targetIds: recipe.targetIds.filter((id) => knownTargets.has(id)),
        timing: {
          startMs: Math.round(recipe.startMs / speed),
          durationMs: Math.round(recipe.durationMs / speed),
          staggerMs:
            recipe.targetIds.length > 1 ? recipe.staggerMs : Math.max(recipe.staggerMs, staggerMs),
          startMode: 'absolute' as const,
        },
        easing,
      }))
      .filter((input) => input.targetIds.length > 0);
    const result = applyPresetBatch(inputs);
    if (!result.ok) {
      notifications.show({
        title: 'Animation order was not applied',
        message: result.error.message,
        color: 'red',
      });
      return;
    }
    trackCreatorEvent('creator_auto_animate_applied', {
      scope: analysis.scope,
      strategy: analysis.strategy,
      confidence_band: analysis.confidenceBand,
      recipe_count: inputs.length,
    });
    setAnalysis(null);
    useUIStore.getState().setCanvasMode('preview');
    notifications.show({
      title: 'Animation order applied',
      message: `${inputs.length} steps were committed and can be undone in one step.`,
      color: 'green',
      icon: <IconCircleCheck size={18} />,
    });
  };

  const rejectAnalysis = () => {
    if (!analysis) return;
    trackCreatorEvent('creator_auto_animate_rejected', {
      scope: analysis.scope,
      strategy: analysis.strategy,
      confidence_band: analysis.confidenceBand,
    });
    setAnalysis(null);
  };

  const escalate = (destination: 'sequence' | 'studio') => {
    useUIStore.getState().setWorkspace(destination);
    trackCreatorEvent('creator_escalated', { destination });
    trackCreatorEvent('creator_workspace_changed', {
      workspace: destination,
      source: 'escalation',
    });
  };

  return (
    <>
      <Stack className="magic-controls-surface" gap="md" p="md">
        <Stack gap={4}>
          <Group justify="space-between" align="center">
            <Title order={3} size="h4">
              Animate
            </Title>
            <Badge variant="light">{hasSelection ? 'Selection' : 'Whole diagram'}</Badge>
          </Group>
          <Text size="sm" c="dimmed">
            Preview the suggested order before applying it.
          </Text>
        </Stack>

        <SceneStateControls />

        <Divider label="Quick animation" labelPosition="center" />

        <Button
          size="md"
          loading={analyzing}
          leftSection={<IconSparkles size={19} aria-hidden="true" />}
          onClick={() => void previewAutoAnimate()}
        >
          Auto Animate
        </Button>

        <Divider label="Selected element presets" labelPosition="center" />
        <Text size="xs" c="dimmed">
          {hasSelection
            ? `${selectedElementIds.length} selected`
            : 'Select one or more canvas elements to apply a preset.'}
        </Text>
        <Group grow>
          <Button
            variant="light"
            disabled={!hasSelection}
            onClick={() => applySelectedPreset('fade')}
          >
            Fade
          </Button>
          <Button
            variant="light"
            disabled={!hasSelection}
            onClick={() => applySelectedPreset('slide')}
          >
            Slide
          </Button>
        </Group>
        <Group grow>
          <Button
            variant="light"
            disabled={!hasSelection}
            onClick={() => applySelectedPreset('draw')}
          >
            Draw
          </Button>
          <Button
            variant="light"
            disabled={!hasSelection}
            onClick={() => applySelectedPreset('pop')}
          >
            Pop
          </Button>
        </Group>

        <Stack gap={6}>
          <Text size="sm" fw={600}>
            Slide direction
          </Text>
          <SegmentedControl
            aria-label="Slide direction"
            fullWidth
            value={direction}
            onChange={(value) => setDirection(value as Direction)}
            data={[
              { value: 'left', label: 'Left' },
              { value: 'right', label: 'Right' },
              { value: 'up', label: 'Up' },
              { value: 'down', label: 'Down' },
            ]}
          />
        </Stack>

        <Stack gap={6}>
          <Text size="sm" fw={600}>
            Speed: {speedBand(speed)}
          </Text>
          <Slider
            aria-label="Animation speed"
            min={0.5}
            max={2}
            step={0.25}
            value={speed}
            onChange={setSpeed}
            marks={[
              { value: 0.5, label: 'Slow' },
              { value: 1, label: 'Normal' },
              { value: 2, label: 'Fast' },
            ]}
          />
        </Stack>

        <Stack gap={6} mt="xs">
          <Text size="sm" fw={600}>
            Stagger: {staggerMs} ms
          </Text>
          <Slider
            aria-label="Animation stagger"
            min={0}
            max={400}
            step={20}
            value={staggerMs}
            onChange={setStaggerMs}
          />
        </Stack>

        <Select
          label="Motion style"
          description="Controls how each animation settles."
          value={easing}
          data={EASING_OPTIONS}
          allowDeselect={false}
          onChange={(value) => {
            if (value) setEasing(value as EasingType);
          }}
        />

        <Divider label="More control" labelPosition="center" />
        <Button
          variant="subtle"
          leftSection={<IconListDetails size={18} aria-hidden="true" />}
          rightSection={<IconArrowRight size={16} aria-hidden="true" />}
          onClick={() => escalate('sequence')}
        >
          Refine sequence
        </Button>
        <Button
          variant="subtle"
          leftSection={<IconLayoutBoard size={18} aria-hidden="true" />}
          rightSection={<IconArrowRight size={16} aria-hidden="true" />}
          onClick={() => escalate('studio')}
        >
          Open Studio
        </Button>
      </Stack>

      <Modal
        opened={analysis !== null}
        onClose={rejectAnalysis}
        title="Review animation order"
        centered
        size="lg"
        closeButtonProps={{ 'aria-label': 'Close animation order preview' }}
      >
        {analysis && (
          <Stack gap="md">
            <Group justify="space-between">
              <Group gap="xs">
                <IconChartDots size={22} aria-hidden="true" />
                <Text fw={700}>{strategyLabel(analysis.strategy)}</Text>
              </Group>
            </Group>
            {analysis.ambiguous && (
              <Alert
                color="blue"
                icon={<IconInfoCircle size={18} aria-hidden="true" />}
                role="status"
                title="Choose an animation order"
              >
                We found a few good ways to animate this diagram. Preview the suggested order, or
                choose a different style before applying.
              </Alert>
            )}
            <Text size="sm" c="dimmed" aria-live="polite">
              {analysis.recipes.length} steps for {analysis.semanticTargets.length} diagram items.
              Labels stay with their shapes, and arrows follow the connected shapes.
            </Text>
            <Text size="xs" c="dimmed">
              Analyzed on this device.
            </Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={rejectAnalysis}>
                Not now
              </Button>
              <Button
                leftSection={<IconPlayerPlay size={18} aria-hidden="true" />}
                onClick={acceptAnalysis}
              >
                Apply order
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  );
}
