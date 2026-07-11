import {
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  Select,
  Slider,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconCamera,
  IconCircleCheck,
  IconDeviceFloppy,
  IconGitCompare,
  IconLayoutBoard,
  IconPlayerPlay,
} from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { EasingType, SceneState, SmartTransitionSettings } from '@excalimate/project-schema';
import { sceneStateFingerprint } from '@excalimate/animation-core';
import type { SmartTransitionProposal } from '../../services/AnimationCommandService';
import {
  DEFAULT_SMART_TRANSITION_SETTINGS,
  acceptSmartTransition,
  captureSceneState,
  customizeSmartTransition,
  deleteSceneTransition,
  proposeSmartTransition,
  setExplicitSceneMapping,
} from '../../services/AnimationCommandService';
import { analyzeSceneDiff } from '../../services/SceneDiffService';
import { trackCreatorEvent } from '../../services/analytics/posthog';
import { useAnimationStore } from '../../stores/animationStore';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';

interface SceneStateControlsProps {
  compact?: boolean;
}

const EASING_OPTIONS: Array<{ value: EasingType; label: string }> = [
  { value: 'easeInOut', label: 'Smooth' },
  { value: 'easeOut', label: 'Gentle' },
  { value: 'linear', label: 'Even' },
  { value: 'easeOutBack', label: 'Playful' },
];

export function SceneStateControls({ compact = false }: SceneStateControlsProps) {
  const sceneStates = useAnimationStore((state) => state.sceneStates);
  const project = useProjectStore((state) => state.project);
  const [captureOpened, setCaptureOpened] = useState(false);
  const [transitionOpened, setTransitionOpened] = useState(false);
  const [stateName, setStateName] = useState('');
  const hasElements = project?.scene.elements.some((element) => !element.isDeleted) ?? false;

  const capture = () => {
    const result = captureSceneState(stateName.trim() || `State ${sceneStates.length + 1}`);
    if (!result.ok) {
      notifications.show({
        title: 'State was not captured',
        message: result.error.message,
        color: 'red',
      });
      return;
    }
    const count =
      result.value.sceneState?.elements.filter((element) => element.present).length ?? 0;
    trackCreatorEvent('creator_scene_state_captured', {
      element_count_bucket: countBucket(count),
    });
    notifications.show({
      title: 'Scene state captured',
      message: 'Only animatable properties and local file references were saved.',
      color: 'green',
      icon: <IconCircleCheck size={18} aria-hidden="true" />,
    });
    setStateName('');
    setCaptureOpened(false);
  };

  return (
    <>
      <Stack gap="xs" p={compact ? 'sm' : 0}>
        <Group justify="space-between" align="center">
          <Stack gap={0}>
            <Text fw={700}>Scene states</Text>
            <Text size="xs" c="dimmed">
              {sceneStates.length} of 50 captured
            </Text>
          </Stack>
          <Badge variant="light">{sceneStates.length}</Badge>
        </Group>
        <Group grow wrap={compact ? 'wrap' : 'nowrap'}>
          <Button
            variant="light"
            size="md"
            disabled={!hasElements}
            leftSection={<IconDeviceFloppy size={18} aria-hidden="true" />}
            onClick={() => setCaptureOpened(true)}
          >
            Capture state
          </Button>
          <Button
            variant="light"
            size="md"
            disabled={sceneStates.length < 2}
            leftSection={<IconGitCompare size={18} aria-hidden="true" />}
            onClick={() => setTransitionOpened(true)}
          >
            Smart Transition
          </Button>
        </Group>
      </Stack>

      <Modal
        opened={captureOpened}
        onClose={() => setCaptureOpened(false)}
        title="Capture scene state"
        centered
        closeButtonProps={{ 'aria-label': 'Close scene state capture' }}
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Capture records presence, transforms, groups, bindings, and shared file references. It
            does not copy binary file data.
          </Text>
          <TextInput
            autoFocus
            label="State name"
            description="Used only in this project."
            placeholder={`State ${sceneStates.length + 1}`}
            value={stateName}
            onChange={(event) => setStateName(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') capture();
            }}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCaptureOpened(false)}>
              Cancel
            </Button>
            <Button onClick={capture}>Capture state</Button>
          </Group>
        </Stack>
      </Modal>

      <SmartTransitionModal
        opened={transitionOpened}
        onClose={() => setTransitionOpened(false)}
        sceneStates={sceneStates}
      />
    </>
  );
}

interface SmartTransitionModalProps {
  opened: boolean;
  onClose: () => void;
  sceneStates: readonly SceneState[];
}

function SmartTransitionModal({ opened, onClose, sceneStates }: SmartTransitionModalProps) {
  const mobile = useMediaQuery('(max-width: 47.99em)', false);
  const abortRef = useRef<AbortController | null>(null);
  const analysisRequestRef = useRef(0);
  const wasOpenedRef = useRef(false);
  const defaultFrom = sceneStates.at(-2)?.id ?? null;
  const defaultTo = sceneStates.at(-1)?.id ?? null;
  const [fromStateId, setFromStateId] = useState<string | null>(defaultFrom);
  const [toStateId, setToStateId] = useState<string | null>(defaultTo);
  const [settings, setSettings] = useState<SmartTransitionSettings>(
    DEFAULT_SMART_TRANSITION_SETTINGS,
  );
  const [proposal, setProposal] = useState<SmartTransitionProposal | null>(null);
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stateOptions = sceneStates.map((state) => ({
    value: state.id,
    label: `${state.name} (${state.elements.filter((element) => element.present).length} elements)`,
  }));
  const fromState = sceneStates.find((state) => state.id === fromStateId);
  const toState = sceneStates.find((state) => state.id === toStateId);
  const cancelAnalysis = () => {
    analysisRequestRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  };
  const resetProposal = (): boolean => {
    cancelAnalysis();
    if (proposal && !accepted) {
      const currentTransition = useAnimationStore
        .getState()
        .sceneTransitions.find((transition) => transition.id === proposal.transition.id);
      if (currentTransition?.status === 'draft') {
        const result = deleteSceneTransition(currentTransition.id);
        if (!result.ok) {
          setError(result.error.message);
          return false;
        }
      }
    }
    setProposal(null);
    setAccepted(false);
    return true;
  };
  const changeSettings = (
    update: (current: SmartTransitionSettings) => SmartTransitionSettings,
  ) => {
    if (!resetProposal()) return;
    setSettings(update);
  };

  useEffect(() => {
    if (opened && !wasOpenedRef.current) {
      setFromStateId(sceneStates.at(-2)?.id ?? null);
      setToStateId(sceneStates.at(-1)?.id ?? null);
      setProposal(null);
      setAccepted(false);
      setError(null);
    } else if (!opened) {
      analysisRequestRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
    }
    wasOpenedRef.current = opened;
  }, [opened, sceneStates]);

  const close = () => {
    cancelAnalysis();
    onClose();
  };

  const preview = async () => {
    if (!fromState || !toState) {
      setError('Choose both a from state and a to state.');
      return;
    }
    if (fromState.id === toState.id) {
      setError('Choose two different scene states.');
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    const requestId = analysisRequestRef.current + 1;
    analysisRequestRef.current = requestId;
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const existingMappings = proposal?.transition.mappings ?? [];
      const fromStateFingerprint = sceneStateFingerprint(fromState);
      const toStateFingerprint = sceneStateFingerprint(toState);
      const diff = await analyzeSceneDiff(fromState, toState, {
        mappings: existingMappings,
        signal: controller.signal,
      });
      if (requestId !== analysisRequestRef.current) return;
      const result = proposeSmartTransition({
        fromStateId: fromState.id,
        toStateId: toState.id,
        transitionId: proposal?.transition.id,
        settings,
        analysis: {
          diff,
          mappings: existingMappings,
          fromStateFingerprint,
          toStateFingerprint,
        },
      });
      if (!result.ok) throw new Error(result.error.message);
      setProposal(result.value);
      trackCreatorEvent('creator_smart_transition_previewed', {
        change_count_bucket: countBucket(result.value.diff.changes.length),
        ambiguous_mapping_count_bucket: ambiguityBucket(
          result.value.diff.ambiguousFromElementIds.length,
        ),
        camera_included: settings.includeCamera,
      });
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return;
      setError(
        caught instanceof Error ? caught.message : 'The local scene comparison could not complete.',
      );
    } finally {
      if (requestId === analysisRequestRef.current) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  };

  const mapElement = async (fromElementId: string, toElementId: string) => {
    if (!proposal || !fromState || !toState) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    const requestId = analysisRequestRef.current + 1;
    analysisRequestRef.current = requestId;
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    const result = setExplicitSceneMapping(proposal.transition.id, {
      fromElementId,
      toElementId,
    });
    if (!result.ok) {
      if (requestId === analysisRequestRef.current) {
        abortRef.current = null;
        setLoading(false);
      }
      setError(result.error.message);
      return;
    }
    const transition = result.value.transition!;
    try {
      const fromStateFingerprint = sceneStateFingerprint(fromState);
      const toStateFingerprint = sceneStateFingerprint(toState);
      const diff = await analyzeSceneDiff(fromState, toState, {
        mappings: transition.mappings,
        signal: controller.signal,
      });
      if (requestId === analysisRequestRef.current) {
        const currentStates = useAnimationStore.getState().sceneStates;
        const currentFrom = currentStates.find((state) => state.id === fromState.id);
        const currentTo = currentStates.find((state) => state.id === toState.id);
        if (
          !currentFrom ||
          !currentTo ||
          sceneStateFingerprint(currentFrom) !== fromStateFingerprint ||
          sceneStateFingerprint(currentTo) !== toStateFingerprint
        ) {
          setProposal(null);
          setError('A scene state changed during analysis. Preview the transition again.');
          return;
        }
        setProposal({ transition, diff });
      }
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === 'AbortError')) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'The local scene comparison could not complete.',
        );
      }
    } finally {
      if (requestId === analysisRequestRef.current) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  };

  const accept = () => {
    if (!proposal) return;
    const result = acceptSmartTransition(proposal.transition.id);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    if (result.value.transition) {
      setProposal({ ...proposal, transition: result.value.transition });
    }
    setAccepted(true);
    useUIStore.getState().setCanvasMode('preview');
    trackCreatorEvent('creator_smart_transition_decided', {
      decision: 'accepted',
      ambiguous_mapping_count_bucket: ambiguityBucket(proposal.diff.ambiguousFromElementIds.length),
    });
    notifications.show({
      title: 'Smart Transition accepted',
      message: 'Managed tracks were added without changing the baseline scene.',
      color: 'green',
      icon: <IconCircleCheck size={18} aria-hidden="true" />,
    });
  };

  const reject = () => {
    if (accepted) {
      close();
      return;
    }
    if (proposal) {
      const result = deleteSceneTransition(proposal.transition.id);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      trackCreatorEvent('creator_smart_transition_decided', {
        decision: 'rejected',
        ambiguous_mapping_count_bucket: ambiguityBucket(
          proposal.diff.ambiguousFromElementIds.length,
        ),
      });
    }
    close();
  };

  const openStudio = () => {
    if (!proposal) return;
    const result = customizeSmartTransition(proposal.transition.id);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    trackCreatorEvent('creator_smart_transition_escalated', {
      action: 'customized',
    });
    useUIStore.getState().setWorkspace('studio');
    trackCreatorEvent('creator_smart_transition_escalated', {
      action: 'open-studio',
    });
    close();
  };

  const ambiguousSuggestions = useMemo(
    () => proposal?.diff.suggestions.filter((suggestion) => suggestion.ambiguous) ?? [],
    [proposal],
  );

  return (
    <Modal
      opened={opened}
      onClose={reject}
      title="Smart Transition"
      size="xl"
      fullScreen={mobile}
      centered={!mobile}
      closeButtonProps={{
        'aria-label': accepted ? 'Close Smart Transition' : 'Reject Smart Transition',
      }}
    >
      <Stack gap="md">
        {error && (
          <Alert color="red" title="Transition needs attention" aria-live="assertive">
            {error}
          </Alert>
        )}
        <Group grow align="flex-start" wrap="wrap">
          <Select
            label="From state"
            data={stateOptions}
            value={fromStateId}
            allowDeselect={false}
            disabled={accepted}
            onChange={(value) => {
              if (!resetProposal()) return;
              setFromStateId(value);
            }}
          />
          <Select
            label="To state"
            data={stateOptions}
            value={toStateId}
            allowDeselect={false}
            disabled={accepted}
            onChange={(value) => {
              if (!resetProposal()) return;
              setToStateId(value);
            }}
          />
        </Group>

        <Group grow align="flex-start" wrap="wrap">
          <Stack gap={6}>
            <Text size="sm" fw={600}>
              Duration: {settings.durationMs} ms
            </Text>
            <Slider
              aria-label="Transition duration"
              min={200}
              max={3_000}
              step={100}
              value={settings.durationMs}
              disabled={accepted}
              onChange={(durationMs) => changeSettings((current) => ({ ...current, durationMs }))}
            />
          </Stack>
          <Stack gap={6}>
            <Text size="sm" fw={600}>
              Stagger: {settings.staggerMs} ms
            </Text>
            <Slider
              aria-label="Transition stagger"
              min={0}
              max={300}
              step={10}
              value={settings.staggerMs}
              disabled={accepted}
              onChange={(staggerMs) => changeSettings((current) => ({ ...current, staggerMs }))}
            />
          </Stack>
        </Group>
        <Group grow align="flex-end" wrap="wrap">
          <Select
            label="Easing"
            value={settings.easing}
            data={EASING_OPTIONS}
            allowDeselect={false}
            disabled={accepted}
            onChange={(value) => {
              if (value) {
                changeSettings((current) => ({
                  ...current,
                  easing: value as EasingType,
                }));
              }
            }}
          />
          <Switch
            label="Include camera movement"
            description="Off by default. Camera changes are never inferred silently."
            checked={settings.includeCamera}
            disabled={accepted}
            onChange={(event) =>
              changeSettings((current) => ({
                ...current,
                includeCamera: event.currentTarget.checked,
              }))
            }
            thumbIcon={<IconCamera size={12} aria-hidden="true" />}
          />
        </Group>

        <Button
          size="md"
          loading={loading}
          disabled={accepted}
          leftSection={<IconPlayerPlay size={18} aria-hidden="true" />}
          onClick={() => void preview()}
        >
          Preview transition
        </Button>

        {proposal && (
          <>
            <Divider />
            <Group justify="space-between" wrap="wrap">
              <Title order={3} size="h4">
                Transition summary
              </Title>
              <Badge variant="light">{proposal.diff.changes.length} changes</Badge>
            </Group>
            <Group gap="xs">
              <Badge color="green" variant="light">
                {proposal.diff.addedElementIds.length} added
              </Badge>
              <Badge color="orange" variant="light">
                {proposal.diff.removedElementIds.length} removed
              </Badge>
              <Badge color="blue" variant="light">
                {proposal.diff.matches.length} matched
              </Badge>
            </Group>
            <Text size="sm" c="dimmed" aria-live="polite">
              Stable IDs are matched automatically. Suggested heuristic pairs are never accepted
              without your explicit mapping.
            </Text>

            {ambiguousSuggestions.length > 0 &&
              (mobile ? (
                <Alert
                  color="orange"
                  title="Mapping review needs a larger screen"
                  icon={<IconAlertTriangle size={18} aria-hidden="true" />}
                >
                  Open this project on a tablet or desktop to review ambiguous element pairs.
                </Alert>
              ) : (
                <Stack gap="sm">
                  <Text fw={700}>Review ambiguous pairs</Text>
                  {ambiguousSuggestions.map((suggestion) => {
                    const source = fromState?.elements.find(
                      (element) => element.id === suggestion.fromElementId,
                    );
                    return (
                      <Select
                        key={suggestion.fromElementId}
                        label={source?.label ?? `${source?.type ?? 'Element'} source`}
                        description={`${Math.round(suggestion.confidence * 100)}% suggested match; not accepted yet`}
                        placeholder="Choose the matching target"
                        searchable
                        data={(toState?.elements ?? [])
                          .filter((element) => element.present)
                          .map((element) => ({
                            value: element.id,
                            label: element.label ?? `${element.type} element`,
                          }))}
                        onChange={(toElementId) => {
                          if (toElementId) {
                            void mapElement(suggestion.fromElementId, toElementId);
                          }
                        }}
                      />
                    );
                  })}
                </Stack>
              ))}

            <Group justify="flex-end" wrap="wrap">
              <Button variant="default" onClick={reject}>
                Reject
              </Button>
              {accepted ? (
                <Button
                  leftSection={<IconLayoutBoard size={18} aria-hidden="true" />}
                  onClick={openStudio}
                >
                  Customize in Studio
                </Button>
              ) : (
                <Button
                  disabled={proposal.diff.ambiguousFromElementIds.length > 0}
                  leftSection={<IconGitCompare size={18} aria-hidden="true" />}
                  onClick={accept}
                >
                  Accept Smart Transition
                </Button>
              )}
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}

function countBucket(count: number): '0' | '1-10' | '11-100' | '101-1000' | '1001+' {
  if (count === 0) return '0';
  if (count <= 10) return '1-10';
  if (count <= 100) return '11-100';
  if (count <= 1_000) return '101-1000';
  return '1001+';
}

function ambiguityBucket(count: number): '0' | '1' | '2-5' | '6+' {
  if (count === 0) return '0';
  if (count === 1) return '1';
  if (count <= 5) return '2-5';
  return '6+';
}
