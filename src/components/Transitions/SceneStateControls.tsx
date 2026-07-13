import {
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  type ButtonProps,
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
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  PROJECT_LIMITS,
  type EasingType,
  type SceneState,
  type SmartTransitionSettings,
} from '@excalimate/project-schema';
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

const CONTROL_BUTTON_STYLES: ButtonProps['styles'] = {
  root: {
    height: 'auto',
    minHeight: 44,
    paddingBlock: 'var(--mantine-spacing-xs)',
  },
  inner: {
    minWidth: 0,
  },
  label: {
    lineHeight: 1.2,
    overflow: 'visible',
    textOverflow: 'clip',
    whiteSpace: 'normal',
  },
};

export function SceneStateControls({ compact = false }: SceneStateControlsProps) {
  const sceneStates = useAnimationStore((state) => state.sceneStates);
  const project = useProjectStore((state) => state.project);
  const [captureOpened, setCaptureOpened] = useState(false);
  const [transitionOpened, setTransitionOpened] = useState(false);
  const [transitionModalRevision, setTransitionModalRevision] = useState(0);
  const [stateName, setStateName] = useState('');
  const hasElements = project?.scene.elements.some((element) => !element.isDeleted) ?? false;
  const workflowHelpId = useId();
  const captureBlockerId = useId();
  const stateCount = sceneStates.length;
  const canCapture = hasElements && stateCount < PROJECT_LIMITS.maxSceneStates;
  const canCreateTransition = stateCount >= 2;
  const workflowInstruction =
    stateCount === 0
      ? 'Capture your starting state.'
      : stateCount === 1
        ? 'Make changes, then capture the next state.'
        : 'Ready to create a transition.';
  const captureBlocker = !hasElements
    ? 'Add something to your diagram before capturing a state.'
    : stateCount >= PROJECT_LIMITS.maxSceneStates
      ? `The ${PROJECT_LIMITS.maxSceneStates}-state limit is reached. Delete a state before capturing another.`
      : null;

  useEffect(() => {
    if (!transitionOpened) return;

    const initialStateKey = sceneStates.map(sceneStateFingerprint).join('|');
    const initialProject = useProjectStore.getState().project;
    let closed = false;
    const closeForContextChange = () => {
      if (closed) return;
      closed = true;
      setTransitionOpened(false);
      setTransitionModalRevision((revision) => revision + 1);
    };
    const unsubscribeAnimation = useAnimationStore.subscribe((state, previousState) => {
      if (
        state.sceneStates !== previousState.sceneStates &&
        state.sceneStates.map(sceneStateFingerprint).join('|') !== initialStateKey
      ) {
        closeForContextChange();
      }
    });
    const unsubscribeProject = useProjectStore.subscribe((state, previousState) => {
      if (state.project !== previousState.project && state.project !== initialProject) {
        closeForContextChange();
      }
    });

    return () => {
      unsubscribeAnimation();
      unsubscribeProject();
    };
  }, [sceneStates, transitionOpened]);

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
      title: 'State captured',
      message: "Your diagram's current look is ready to use in a transition.",
      color: 'green',
      icon: <IconCircleCheck size={18} aria-hidden="true" />,
    });
    setStateName('');
    setCaptureOpened(false);
  };

  return (
    <>
      <Stack gap="xs" p={compact ? 'sm' : 0} miw={0} w="100%">
        <Stack gap={2}>
          <Text fw={700}>Create a transition</Text>
          <Text size="xs" c="dimmed">
            {stateCount} of {PROJECT_LIMITS.maxSceneStates} states
          </Text>
        </Stack>
        <Text id={workflowHelpId} size="sm" c="dimmed" aria-live="polite">
          {workflowInstruction}
        </Text>
        {captureBlocker && (
          <Text id={captureBlockerId} size="xs" c="dimmed">
            {captureBlocker}
          </Text>
        )}
        <SimpleGrid
          data-testid="transition-control-grid"
          cols={2}
          spacing="xs"
          w="100%"
          miw={0}
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 12rem), 1fr))',
          }}
        >
          <Button
            fullWidth
            variant="light"
            size="md"
            styles={CONTROL_BUTTON_STYLES}
            data-disabled={!canCapture || undefined}
            aria-disabled={!canCapture}
            aria-describedby={
              captureBlocker ? `${workflowHelpId} ${captureBlockerId}` : workflowHelpId
            }
            leftSection={<IconDeviceFloppy size={18} aria-hidden="true" />}
            onClick={(event) => {
              if (!canCapture) {
                event.preventDefault();
                return;
              }
              setCaptureOpened(true);
            }}
          >
            Capture state
          </Button>
          <Button
            fullWidth
            variant="light"
            size="md"
            styles={CONTROL_BUTTON_STYLES}
            data-disabled={!canCreateTransition || undefined}
            aria-disabled={!canCreateTransition}
            aria-describedby={workflowHelpId}
            leftSection={<IconGitCompare size={18} aria-hidden="true" />}
            onClick={(event) => {
              if (!canCreateTransition) {
                event.preventDefault();
                return;
              }
              setTransitionOpened(true);
            }}
          >
            Create transition
          </Button>
        </SimpleGrid>
      </Stack>

      <Modal
        opened={captureOpened}
        onClose={() => setCaptureOpened(false)}
        title={stateCount === 0 ? 'Capture starting state' : 'Capture next state'}
        centered
        closeButtonProps={{ 'aria-label': 'Close state capture' }}
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Save how your diagram looks now. Local files stay in this project.
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
        key={transitionModalRevision}
        opened={transitionOpened && canCreateTransition}
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
  const proposalRef = useRef<SmartTransitionProposal | null>(null);
  const proposalProjectRef = useRef(useProjectStore.getState().project);
  const acceptedRef = useRef(false);
  const updateProposal = (next: SmartTransitionProposal | null) => {
    proposalRef.current = next;
    proposalProjectRef.current = next ? useProjectStore.getState().project : null;
    setProposal(next);
  };
  const updateAccepted = (next: boolean) => {
    acceptedRef.current = next;
    setAccepted(next);
  };
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
    updateProposal(null);
    updateAccepted(false);
    return true;
  };
  const changeSettings = (
    update: (current: SmartTransitionSettings) => SmartTransitionSettings,
  ) => {
    if (!resetProposal()) return;
    setSettings(update);
  };

  useEffect(
    () => () => {
      analysisRequestRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
      const pendingProposal = proposalRef.current;
      if (
        pendingProposal &&
        !acceptedRef.current &&
        useProjectStore.getState().project === proposalProjectRef.current
      ) {
        const currentDraft = useAnimationStore
          .getState()
          .sceneTransitions.find(
            (transition) =>
              transition.id === pendingProposal.transition.id && transition.status === 'draft',
          );
        if (currentDraft) {
          const result = deleteSceneTransition(currentDraft.id);
          if (!result.ok) {
            notifications.show({
              title: 'Transition draft was not removed',
              message: result.error.message,
              color: 'red',
            });
          }
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (opened && !wasOpenedRef.current) {
      setFromStateId(sceneStates.at(-2)?.id ?? null);
      setToStateId(sceneStates.at(-1)?.id ?? null);
      updateProposal(null);
      updateAccepted(false);
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
      setError('Choose both a starting point and a next state.');
      return;
    }
    if (fromState.id === toState.id) {
      setError('Choose two different states.');
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
      const existingDraft = proposal
        ? null
        : useAnimationStore
            .getState()
            .sceneTransitions.find(
              (transition) =>
                transition.fromStateId === fromState.id &&
                transition.toStateId === toState.id &&
                transition.status === 'draft',
            );
      const existingMappings =
        proposal?.transition.mappings ?? existingDraft?.mappings ?? [];
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
        transitionId: proposal?.transition.id ?? existingDraft?.id,
        settings,
        analysis: {
          diff,
          mappings: existingMappings,
          fromStateFingerprint,
          toStateFingerprint,
        },
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      updateProposal(result.value);
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
        'We could not compare the captured states. Check them and preview the transition again.',
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
          updateProposal(null);
          setError('A captured state changed. Preview the transition again.');
          return;
        }
        updateProposal({ transition, diff });
      }
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === 'AbortError')) {
        setError(
          'We could not compare the captured states. Check them and preview the transition again.',
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
      updateProposal({ ...proposal, transition: result.value.transition });
    }
    updateAccepted(true);
    useUIStore.getState().setCanvasMode('preview');
    trackCreatorEvent('creator_smart_transition_decided', {
      decision: 'accepted',
      ambiguous_mapping_count_bucket: ambiguityBucket(proposal.diff.ambiguousFromElementIds.length),
    });
    notifications.show({
      title: 'Transition created',
      message: 'Your transition is ready to preview or customize.',
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
      title="Create transition"
      size="xl"
      fullScreen={mobile}
      centered={!mobile}
      closeButtonProps={{
        'aria-label': accepted ? 'Close transition' : 'Cancel transition',
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
            label="Starting point"
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
            label="Next state"
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
                {proposal.diff.matches.length} paired
              </Badge>
            </Group>
            <Text size="sm" c="dimmed" aria-live="polite">
              We paired unchanged elements automatically. Review any choices below before creating
              the transition.
            </Text>

            {ambiguousSuggestions.length > 0 &&
              (mobile ? (
                <Alert
                  color="orange"
                  title="Review element pairs on a larger screen"
                  icon={<IconAlertTriangle size={18} aria-hidden="true" />}
                >
                  Open this project on a tablet or desktop to choose how these elements connect
                  between states.
                </Alert>
              ) : (
                <Stack gap="sm">
                  <Text fw={700}>Review suggested pairs</Text>
                  {ambiguousSuggestions.map((suggestion) => {
                    const source = fromState?.elements.find(
                      (element) => element.id === suggestion.fromElementId,
                    );
                    return (
                      <Select
                        key={suggestion.fromElementId}
                        label={source?.label ?? `${source?.type ?? 'Element'} element`}
                        description="Choose which element this should become."
                        placeholder="Choose the next element"
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
                  Create transition
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
