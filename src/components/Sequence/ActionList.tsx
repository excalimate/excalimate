import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  Collapse,
  Divider,
  Group,
  Menu,
  NumberInput,
  Paper,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Title,
  Tooltip,
  VisuallyHidden,
} from '@mantine/core';
import { useElementSize, useReducedMotion } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconArrowDown,
  IconArrowUp,
  IconCamera,
  IconChevronDown,
  IconCopy,
  IconGripVertical,
  IconPlayerPlay,
  IconTrash,
  IconZoomScan,
} from '@tabler/icons-react';
import {
  CAMERA_FRAME_TARGET_ID,
  EASING_TYPES,
  type AnimationAction,
  type AnimationActionTiming,
  type EasingType,
} from '@excalimate/project-schema';
import { useAnimationStore } from '../../stores/animationStore';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import {
  createCameraMove,
  deleteActions,
  deleteUnmanagedTrack,
  duplicateAction,
  duplicateUnmanagedTrack,
  reorderActions,
  setActionsEnabled,
  setUnmanagedTrackEnabled,
  updateAction,
  updateActionTimings,
  type AnimationCommandResult,
} from '../../services/AnimationCommandService';
import { computeFrameAtTime } from '../../core/engine/playbackSingleton';
import { trackCreatorEvent } from '../../services/analytics/posthog';
import {
  SEQUENCE_MOVE_REQUEST_EVENT,
  type SequenceMoveRequest,
} from './sequenceHotkeys';
import {
  SEQUENCE_VIRTUALIZATION_THRESHOLD,
  SEQUENCE_ROW_HEIGHT,
  SPEED_DURATION_MS,
  START_MODE_LABELS,
  buildSequenceRows,
  calculateCameraFit,
  formatFriendlyDuration,
  getFriendlySpeed,
  getVirtualActionWindow,
  moveActionId,
  moveActionIdToIndex,
  shouldPreviewAction,
  type ActionMove,
  type FriendlySpeed,
  type SequenceRow,
} from './sequenceModel';

interface DragState {
  actionId: string;
  overActionId: string;
  pointerId: number;
}

function notifyFailure(
  result: AnimationCommandResult<unknown>,
  title: string,
): boolean {
  if (result.ok) return false;
  notifications.show({
    color: 'red',
    title,
    message: result.error.message,
  });
  return true;
}

function getActionLabel(action: AnimationAction): string {
  if (action.preset) {
    return action.preset
      .split('-')
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(' ');
  }
  return action.type[0]!.toUpperCase() + action.type.slice(1);
}

export function ActionList() {
  const actions = useAnimationStore((state) => state.actions);
  const tracks = useAnimationStore((state) => state.timeline.tracks);
  const targets = useProjectStore((state) => state.targets);
  const cameraFrame = useProjectStore((state) => state.cameraFrame);
  const selectedElementIds = useUIStore((state) => state.selectedElementIds);
  const reducedMotion = useReducedMotion();
  const { ref: viewportMeasureRef, height: viewportHeight } =
    useElementSize<HTMLDivElement>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [scrollTop, setScrollTop] = useState(0);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const openedTracked = useRef(false);
  const invalidNotified = useRef(false);

  const rows = useMemo(
    () => buildSequenceRows(actions, tracks, targets),
    [actions, targets, tracks],
  );
  const actionIds = useMemo(
    () => actions.map((action) => action.id),
    [actions],
  );
  const tracksById = useMemo(
    () => new Map(tracks.map((track) => [track.id, track])),
    [tracks],
  );
  const invalidCount = rows.reduce(
    (count, row) => count + row.invalidTargetIds.length,
    0,
  );
  const virtualWindow =
    expandedId === null
      ? getVirtualActionWindow(rows.length, scrollTop, viewportHeight || 600)
      : {
          virtualized: false,
          start: 0,
          end: rows.length,
          paddingTop: 0,
          paddingBottom: 0,
        };
  const visibleRows = rows.slice(virtualWindow.start, virtualWindow.end);
  const selectedActions = actions.filter((action) =>
    selectedIds.has(action.id),
  );
  const selectionHasDetached = selectedActions.some(
    (action) => action.status === 'detached',
  );
  const selectionHasCustomized = selectedActions.some(
    (action) =>
      action.status === 'customized' || action.status === 'detached',
  );

  useEffect(() => {
    if (!pendingFocusId) return;
    const frame = requestAnimationFrame(() => {
      const rowIndex = rows.findIndex((row) => row.id === pendingFocusId);
      if (rowIndex < 0) {
        setPendingFocusId(null);
        return;
      }
      const element = document.getElementById(`sequence-row-${pendingFocusId}`);
      if (element) {
        element.focus();
        setPendingFocusId(null);
        return;
      }
      const top = rowIndex * SEQUENCE_ROW_HEIGHT;
      scrollViewportRef.current?.scrollTo({ top });
      setScrollTop(top);
    });
    return () => cancelAnimationFrame(frame);
  }, [pendingFocusId, rows, virtualWindow.end, virtualWindow.start]);

  useEffect(() => {
    if (openedTracked.current) return;
    openedTracked.current = true;
    trackCreatorEvent('creator_sequence_opened', {
      action_count: actions.length,
      custom_count: rows.filter((row) => row.kind === 'custom').length,
    });
  }, [actions.length, rows]);

  useEffect(() => {
    if (invalidCount === 0 || invalidNotified.current) return;
    invalidNotified.current = true;
    notifications.show({
      color: 'red',
      title: 'Sequence has invalid references',
      message: `${invalidCount} target reference${invalidCount === 1 ? '' : 's'} could not be resolved. The affected rows remain available.`,
      autoClose: false,
    });
  }, [invalidCount]);

  const applyOrder = useCallback(
    (
      orderedIds: readonly string[],
      movedActionId: string,
      source: 'drag' | 'keyboard',
    ) => {
      if (orderedIds.every((id, index) => id === actionIds[index])) {
        setPendingFocusId(movedActionId);
        return;
      }
      const result = reorderActions(orderedIds);
      if (notifyFailure(result, 'Could not reorder action')) return;
      const position = orderedIds.indexOf(movedActionId) + 1;
      setAnnouncement(
        `Action moved to position ${position} of ${orderedIds.length}.`,
      );
      setPendingFocusId(movedActionId);
      trackCreatorEvent('creator_sequence_action_reordered', { source });
    },
    [actionIds],
  );

  const moveAction = useCallback(
    (actionId: string, move: ActionMove) => {
      applyOrder(moveActionId(actionIds, actionId, move), actionId, 'keyboard');
    },
    [actionIds, applyOrder],
  );

  useEffect(() => {
    const handleMoveRequest = (event: Event) => {
      const detail = (event as CustomEvent<SequenceMoveRequest>).detail;
      if (detail) moveAction(detail.actionId, detail.move);
    };
    window.addEventListener(SEQUENCE_MOVE_REQUEST_EVENT, handleMoveRequest);
    return () =>
      window.removeEventListener(SEQUENCE_MOVE_REQUEST_EVENT, handleMoveRequest);
  }, [moveAction]);

  useEffect(() => {
    if (!dragState) return;
    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== dragStateRef.current?.pointerId) return;
      const element = document.elementFromPoint(event.clientX, event.clientY);
      const row = element?.closest<HTMLElement>('[data-sequence-action-id]');
      const overActionId = row?.dataset['sequenceActionId'];
      const current = dragStateRef.current;
      if (!current || !overActionId || !actionIds.includes(overActionId)) return;
      if (current.overActionId === overActionId) return;
      const next = { ...current, overActionId };
      dragStateRef.current = next;
      setDragState(next);
      setAnnouncement(
        `Moving over position ${actionIds.indexOf(overActionId) + 1}.`,
      );
    };
    const finishDrag = (cancelled: boolean) => {
      const current = dragStateRef.current;
      dragStateRef.current = null;
      setDragState(null);
      if (!current) return;
      if (cancelled) {
        setAnnouncement('Action move cancelled.');
        setPendingFocusId(current.actionId);
        return;
      }
      const destination = actionIds.indexOf(current.overActionId);
      applyOrder(
        moveActionIdToIndex(actionIds, current.actionId, destination),
        current.actionId,
        'drag',
      );
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerId === dragStateRef.current?.pointerId) finishDrag(false);
    };
    const handlePointerCancel = (event: PointerEvent) => {
      if (event.pointerId === dragStateRef.current?.pointerId) finishDrag(true);
    };
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerCancel);
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [actionIds, applyOrder, dragState]);

  const startDrag = (actionId: string, event: React.PointerEvent) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const next = {
      actionId,
      overActionId: actionId,
      pointerId: event.pointerId,
    };
    dragStateRef.current = next;
    setDragState(next);
    setAnnouncement(
      `Moving action at position ${actionIds.indexOf(actionId) + 1}. Move to another row and release to drop. Press Escape to cancel.`,
    );
  };

  useEffect(() => {
    if (!dragState) return;
    const cancelOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      const current = dragStateRef.current;
      dragStateRef.current = null;
      setDragState(null);
      setAnnouncement('Action move cancelled.');
      setPendingFocusId(current?.actionId ?? null);
    };
    document.addEventListener('keydown', cancelOnEscape, true);
    return () => document.removeEventListener('keydown', cancelOnEscape, true);
  }, [dragState]);

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const runBulkEnabled = (enabled: boolean) => {
    const ids = selectedActions.map((action) => action.id);
    const result = setActionsEnabled(ids, enabled);
    if (notifyFailure(result, 'Could not update selected actions')) return;
    setAnnouncement(
      `${ids.length} action${ids.length === 1 ? '' : 's'} ${enabled ? 'enabled' : 'disabled'}.`,
    );
    trackCreatorEvent('creator_sequence_bulk_action', {
      action: enabled ? 'enable' : 'disable',
      action_count: ids.length,
    });
  };

  const runBulkDelete = () => {
    const ids = selectedActions.map((action) => action.id);
    const firstIndex = Math.min(
      ...ids.map((id) => actionIds.indexOf(id)).filter((index) => index >= 0),
    );
    const focusId =
      actionIds.find(
        (id, index) => index >= firstIndex && !selectedIds.has(id),
      ) ??
      [...actionIds]
        .reverse()
        .find((id) => !selectedIds.has(id));
    const result = deleteActions(ids);
    if (notifyFailure(result, 'Could not delete selected actions')) return;
    setSelectedIds(new Set());
    setAnnouncement(
      `${ids.length} action${ids.length === 1 ? '' : 's'} deleted.`,
    );
    setPendingFocusId(focusId ?? null);
    trackCreatorEvent('creator_sequence_bulk_action', {
      action: 'delete',
      action_count: ids.length,
    });
  };

  const runBulkTiming = (
    update: Partial<AnimationActionTiming>,
    grouped = false,
  ) => {
    const result = updateActionTimings(
      selectedActions.map((action) => ({
        actionId: action.id,
        timing: { ...action.timing, ...update },
      })),
    );
    if (notifyFailure(result, 'Could not update selected timing')) return;
    setAnnouncement(
      `Timing updated for ${selectedActions.length} selected actions.`,
    );
    if (grouped) {
      trackCreatorEvent('creator_sequence_actions_grouped', {
        action_count: selectedActions.length,
      });
    }
    trackCreatorEvent('creator_sequence_timing_changed', {
      scope: 'bulk',
      start_mode:
        update.startMode ?? selectedActions[0]?.timing.startMode ?? 'absolute',
      speed_band: getFriendlySpeed(
        update.durationMs ??
          selectedActions[0]?.timing.durationMs ??
          SPEED_DURATION_MS.normal,
      ),
    });
    trackCreatorEvent('creator_sequence_bulk_action', {
      action: 'timing',
      action_count: selectedActions.length,
    });
  };

  const selectedTargets = targets.filter(
    (target) =>
      selectedElementIds.includes(target.id) &&
      target.id !== CAMERA_FRAME_TARGET_ID,
  );

  const createCameraHelper = (
    preset: 'camera-fit-selection' | 'camera-hold' | 'camera-pan-zoom',
  ) => {
    const isHold = preset === 'camera-hold';
    const fit = isHold
      ? null
      : calculateCameraFit(selectedTargets, cameraFrame);
    if (!isHold && !fit) {
      notifications.show({
        color: 'red',
        title: 'Select a target',
        message: 'Select one or more canvas targets before adding this camera action.',
      });
      return;
    }
    const playback = usePlaybackStore.getState();
    const cameraState = playback.frameState.get(CAMERA_FRAME_TARGET_ID);
    const result = createCameraMove({
      timing: {
        startMs: Math.round(playback.currentTime),
        durationMs:
          preset === 'camera-fit-selection'
            ? SPEED_DURATION_MS.fast
            : preset === 'camera-pan-zoom'
              ? SPEED_DURATION_MS.slow
              : SPEED_DURATION_MS.normal,
        staggerMs: 0,
        startMode: 'absolute',
      },
      x: isHold ? (cameraState?.translateX ?? 0) : fit!.x,
      y: isHold ? (cameraState?.translateY ?? 0) : fit!.y,
      scale: isHold ? (cameraState?.scaleX ?? 1) : fit!.scale,
      fromX: cameraState?.translateX ?? 0,
      fromY: cameraState?.translateY ?? 0,
      fromScale: cameraState?.scaleX ?? 1,
      fromRotation: cameraState?.rotation ?? 0,
      mode: isHold ? 'hold' : 'move',
      preset,
      easing: preset === 'camera-pan-zoom' ? 'easeInOut' : 'easeOut',
    });
    if (notifyFailure(result, 'Could not add camera action')) return;
    const actionId = result.ok ? result.value.action?.id : undefined;
    setAnnouncement('Camera action added to the sequence.');
    setPendingFocusId(actionId ?? null);
  };

  const openStudio = (row: SequenceRow) => {
    const trackId =
      row.kind === 'custom'
        ? row.track.id
        : row.action.ownership[0]?.trackId;
    if (trackId) useAnimationStore.getState().selectTrack(trackId);
    useUIStore.getState().setWorkspace('studio');
    const customStatus =
      row.kind === 'custom'
        ? 'unmanaged'
        : row.action.status === 'customized' ||
            row.action.status === 'detached'
          ? row.action.status
          : null;
    if (customStatus) {
      trackCreatorEvent('creator_sequence_customized_opened_in_studio', {
        status: customStatus,
      });
    }
  };

  const updateTiming = (
    action: AnimationAction,
    timing: AnimationActionTiming,
    easing: EasingType,
  ) => {
    const result = updateAction(action.id, (current) => ({
      ...current,
      timing,
      easing,
    }));
    if (notifyFailure(result, 'Could not update action timing')) return;
    setAnnouncement('Action timing updated.');
    trackCreatorEvent('creator_sequence_timing_changed', {
      scope: 'single',
      start_mode: timing.startMode,
      speed_band: getFriendlySpeed(timing.durationMs),
    });
  };

  return (
    <Stack h="100%" gap={0}>
      <Box p="md">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Box>
            <Title order={2} size="h4">
              Action List
            </Title>
            <Text size="sm" c="dimmed">
              {actions.length} managed action{actions.length === 1 ? '' : 's'}
              {rows.length > actions.length
                ? `, ${rows.length - actions.length} custom track${rows.length - actions.length === 1 ? '' : 's'}`
                : ''}
            </Text>
          </Box>
          {actions.length > 0 && (
            <Checkbox
              aria-label="Select all managed actions"
              checked={
                selectedActions.length === actions.length && actions.length > 0
              }
              indeterminate={
                selectedActions.length > 0 &&
                selectedActions.length < actions.length
              }
              onChange={(event) =>
                setSelectedIds(
                  event.currentTarget.checked
                    ? new Set(actionIds)
                    : new Set(),
                )
              }
            />
          )}
        </Group>

        <Group mt="sm" gap="xs" wrap="wrap" aria-label="Camera action helpers">
          <Button
            size="compact-xs"
            variant="light"
            leftSection={<IconZoomScan size={15} aria-hidden="true" />}
            disabled={selectedTargets.length === 0}
            onClick={() => createCameraHelper('camera-fit-selection')}
          >
            Fit selection
          </Button>
          <Button
            size="compact-xs"
            variant="light"
            leftSection={<IconCamera size={15} aria-hidden="true" />}
            onClick={() => createCameraHelper('camera-hold')}
          >
            Hold
          </Button>
          <Button
            size="compact-xs"
            variant="light"
            leftSection={<IconPlayerPlay size={15} aria-hidden="true" />}
            disabled={selectedTargets.length === 0}
            onClick={() => createCameraHelper('camera-pan-zoom')}
          >
            Pan/Zoom
          </Button>
        </Group>

        {selectedActions.length > 0 && (
          <Paper withBorder radius="md" p="xs" mt="sm" aria-label="Bulk actions">
            <Group gap="xs" wrap="wrap">
              <Text size="xs" fw={600}>
                {selectedActions.length} selected
              </Text>
              <Button
                size="compact-xs"
                variant="default"
                disabled={selectionHasDetached}
                onClick={() => runBulkEnabled(true)}
              >
                Enable
              </Button>
              <Button
                size="compact-xs"
                variant="default"
                disabled={selectionHasDetached}
                onClick={() => runBulkEnabled(false)}
              >
                Disable
              </Button>
              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <Button
                    size="compact-xs"
                    variant="default"
                    rightSection={<IconChevronDown size={13} />}
                    disabled={selectionHasCustomized}
                  >
                    Timing
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>Relationship</Menu.Label>
                  <Menu.Item
                    onClick={() =>
                      runBulkTiming({
                        startMode: 'afterPrevious',
                        startMs: 0,
                      })
                    }
                  >
                    After previous
                  </Menu.Item>
                  <Menu.Item
                    onClick={() =>
                      runBulkTiming(
                        { startMode: 'withPrevious', startMs: 0 },
                        true,
                      )
                    }
                  >
                    With previous
                  </Menu.Item>
                  <Menu.Item
                    onClick={() =>
                      runBulkTiming({
                        startMode: 'absolute',
                        startMs: Math.round(
                          usePlaybackStore.getState().currentTime,
                        ),
                      })
                    }
                  >
                    At playhead
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Label>Speed</Menu.Label>
                  {(
                    Object.entries(SPEED_DURATION_MS) as [
                      FriendlySpeed,
                      number,
                    ][]
                  ).map(([speed, durationMs]) => (
                    <Menu.Item
                      key={speed}
                      onClick={() => runBulkTiming({ durationMs })}
                    >
                      {speed[0]!.toUpperCase() + speed.slice(1)}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
              <Button
                size="compact-xs"
                color="red"
                variant="light"
                leftSection={<IconTrash size={14} aria-hidden="true" />}
                onClick={runBulkDelete}
              >
                Delete
              </Button>
            </Group>
          </Paper>
        )}
      </Box>

      <Divider />
      <Box ref={viewportMeasureRef} style={{ flex: 1, minHeight: 0 }}>
        <ScrollArea
          h="100%"
          type="auto"
          onScrollPositionChange={({ y }) => setScrollTop(y)}
          viewportRef={scrollViewportRef}
        >
          {rows.length === 0 ? (
            <Stack align="center" justify="center" mih={260} p="xl">
              <IconPlayerPlay
                size={36}
                color="var(--mantine-color-dimmed)"
                aria-hidden="true"
              />
              <Text fw={600}>No actions yet</Text>
              <Text size="sm" c="dimmed" ta="center">
                Apply an animation in Magic, or add a camera action above.
              </Text>
            </Stack>
          ) : (
            <Box
              component="ol"
              aria-label="Sequence actions"
              m={0}
              p="sm"
              style={{
                listStyle: 'none',
                paddingTop: virtualWindow.paddingTop + 8,
                paddingBottom: virtualWindow.paddingBottom + 8,
              }}
              data-virtualized={virtualWindow.virtualized || undefined}
              data-virtualization-threshold={
                SEQUENCE_VIRTUALIZATION_THRESHOLD
              }
            >
              {visibleRows.map((row, visibleIndex) => {
                const index = virtualWindow.start + visibleIndex;
                const customizedEnabled =
                  row.kind === 'action' &&
                  row.action.status === 'customized'
                    ? row.action.ownership.every(
                        (ownership) =>
                          tracksById.get(ownership.trackId)?.enabled !== false,
                      )
                    : true;
                return (
                  <ActionRow
                    key={row.id}
                    row={row}
                    index={index}
                    total={rows.length}
                    actionIndex={
                      row.kind === 'action'
                        ? actionIds.indexOf(row.id)
                        : -1
                    }
                    actionCount={actionIds.length}
                    selected={selectedIds.has(row.id)}
                    expanded={expandedId === row.id}
                    dragging={dragState?.actionId === row.id}
                    dragOver={dragState?.overActionId === row.id}
                    enabled={
                      row.kind === 'custom'
                        ? row.track.enabled
                        : row.action.status === 'disabled'
                          ? false
                          : customizedEnabled
                    }
                    reducedMotion={reducedMotion}
                    onSelect={toggleSelected}
                    onExpanded={(id, expanded) =>
                      setExpandedId(expanded ? id : null)
                    }
                    onMove={moveAction}
                    onDragStart={startDrag}
                    onPreview={(time) => computeFrameAtTime(time)}
                    onOpenStudio={openStudio}
                    onTiming={updateTiming}
                    onToggleEnabled={(targetRow, enabled) => {
                      const result =
                        targetRow.kind === 'action'
                          ? setActionsEnabled([targetRow.action.id], enabled)
                          : setUnmanagedTrackEnabled(
                              targetRow.track.id,
                              enabled,
                            );
                      if (
                        notifyFailure(
                          result,
                          `Could not ${enabled ? 'enable' : 'disable'} row`,
                        )
                      ) {
                        return;
                      }
                      setAnnouncement(
                        `Row ${enabled ? 'enabled' : 'disabled'}.`,
                      );
                      setPendingFocusId(targetRow.id);
                    }}
                    onDuplicate={(targetRow) => {
                      const result =
                        targetRow.kind === 'action'
                          ? duplicateAction(targetRow.action.id)
                          : duplicateUnmanagedTrack(targetRow.track.id);
                      if (notifyFailure(result, 'Could not duplicate row')) return;
                      const duplicateId =
                        result.ok && result.value.action
                          ? result.value.action.id
                          : result.ok && result.value.track
                            ? `track:${result.value.track.id}`
                            : undefined;
                      setAnnouncement('Row duplicated.');
                      setPendingFocusId(duplicateId ?? targetRow.id);
                    }}
                    onDelete={(targetRow) => {
                      const focusId =
                        rows[index + 1]?.id ?? rows[index - 1]?.id;
                      const result =
                        targetRow.kind === 'action'
                          ? deleteActions([targetRow.action.id])
                          : deleteUnmanagedTrack(targetRow.track.id);
                      if (notifyFailure(result, 'Could not delete row')) return;
                      setSelectedIds((current) => {
                        const next = new Set(current);
                        next.delete(targetRow.id);
                        return next;
                      });
                      setAnnouncement('Row deleted.');
                      setPendingFocusId(focusId ?? null);
                    }}
                  />
                );
              })}
            </Box>
          )}
        </ScrollArea>
      </Box>
      <VisuallyHidden aria-live="polite" aria-atomic="true">
        {announcement}
      </VisuallyHidden>
    </Stack>
  );
}

interface ActionRowProps {
  row: SequenceRow;
  index: number;
  total: number;
  actionIndex: number;
  actionCount: number;
  selected: boolean;
  expanded: boolean;
  dragging: boolean;
  dragOver: boolean;
  enabled: boolean;
  reducedMotion: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onExpanded: (id: string, expanded: boolean) => void;
  onMove: (id: string, move: ActionMove) => void;
  onDragStart: (id: string, event: React.PointerEvent) => void;
  onPreview: (time: number) => void;
  onOpenStudio: (row: SequenceRow) => void;
  onTiming: (
    action: AnimationAction,
    timing: AnimationActionTiming,
    easing: EasingType,
  ) => void;
  onToggleEnabled: (row: SequenceRow, enabled: boolean) => void;
  onDuplicate: (row: SequenceRow) => void;
  onDelete: (row: SequenceRow) => void;
}

const ActionRow = memo(function ActionRow({
  row,
  index,
  total,
  actionIndex,
  actionCount,
  selected,
  expanded,
  dragging,
  dragOver,
  enabled,
  reducedMotion,
  onSelect,
  onExpanded,
  onMove,
  onDragStart,
  onPreview,
  onOpenStudio,
  onTiming,
  onToggleEnabled,
  onDuplicate,
  onDelete,
}: ActionRowProps) {
  const action = row.kind === 'action' ? row.action : null;
  const startMs = row.kind === 'action' ? row.resolved.startMs : row.startMs;
  const endMs = row.kind === 'action' ? row.resolved.endMs : row.endMs;
  const isCustomized =
    action?.status === 'customized' || action?.status === 'detached';
  const isDetached = action?.status === 'detached';
  const hasCustomizedCanonicalTiming =
    action?.status === 'customized' &&
    row.kind === 'action' &&
    row.hasCanonicalTiming;
  const canEditTiming = action !== null && !isCustomized;
  const status =
    row.invalidTargetIds.length > 0
      ? 'Invalid reference'
      : row.kind === 'custom'
        ? 'Custom timeline'
        : action!.status === 'managed'
          ? 'Managed'
          : action!.status[0]!.toUpperCase() + action!.status.slice(1);
  const statusColor =
    row.invalidTargetIds.length > 0
      ? 'red'
      : row.kind === 'custom'
        ? 'violet'
        : action!.status === 'managed'
          ? 'green'
          : action!.status === 'disabled'
            ? 'gray'
            : 'yellow';
  const title =
    row.kind === 'action'
      ? getActionLabel(row.action)
      : `${row.track.property} keyframes`;
  const startRelationship =
    isDetached
      ? 'Detached metadata'
      : hasCustomizedCanonicalTiming
        ? 'Studio-defined'
        : row.kind === 'action'
      ? START_MODE_LABELS[row.action.timing.startMode]
      : 'Exact timeline';
  const duration =
    isDetached
      ? 'See custom rows'
      : hasCustomizedCanonicalTiming
        ? `Exact (${Math.max(0, endMs - startMs)} ms)`
        : row.kind === 'action'
      ? formatFriendlyDuration(row.action.timing.durationMs)
      : `Exact (${Math.max(0, endMs - startMs)} ms)`;
  const stagger =
    isDetached || hasCustomizedCanonicalTiming
      ? 'Studio-defined'
      : row.kind === 'action'
      ? `${row.action.timing.staggerMs} ms`
      : 'Not applicable';
  const easing =
    hasCustomizedCanonicalTiming && row.kind === 'action'
      ? row.canonicalEasing.join(', ') || 'Studio-defined'
      : isDetached
        ? 'Studio-defined'
        : row.kind === 'action'
      ? row.action.easing
      : [...new Set(row.track.keyframes.map((keyframe) => keyframe.easing))].join(
          ', ',
        ) || 'Not applicable';

  return (
    <Paper
      component="li"
      id={`sequence-row-${row.id}`}
      tabIndex={0}
      className="sequence-action-row"
      data-sequence-action-id={row.kind === 'action' ? row.id : undefined}
      data-status={row.kind === 'action' ? row.action.status : 'unmanaged'}
      data-invalid={row.invalidTargetIds.length > 0 || undefined}
      data-dragging={dragging || undefined}
      data-drag-over={dragOver || undefined}
      aria-posinset={index + 1}
      aria-setsize={total}
      aria-describedby={`sequence-description-${row.id}`}
      withBorder
      radius="md"
      p="sm"
      mb="sm"
      h={expanded ? undefined : SEQUENCE_ROW_HEIGHT - 8}
      style={{ overflow: expanded ? 'visible' : 'hidden' }}
      onPointerEnter={() => {
        if (
          !isDetached &&
          shouldPreviewAction(reducedMotion, 'hover')
        ) {
          onPreview(startMs);
        }
      }}
      onFocus={(event) => {
        if (
          shouldPreviewAction(reducedMotion, 'focus') &&
          !isDetached &&
          event.currentTarget === event.target
        ) {
          onPreview(startMs);
        }
      }}
    >
      <Group align="flex-start" wrap="nowrap" gap="xs">
        {row.kind === 'action' ? (
          <>
            <Checkbox
              aria-label={`Select ${title}`}
              checked={selected}
              onChange={(event) =>
                onSelect(row.id, event.currentTarget.checked)
              }
            />
            <Tooltip label="Drag to reorder. Keyboard controls are in the move menu.">
              <ActionIcon
                className="sequence-action-control"
                aria-label={`Drag ${title}`}
                variant="subtle"
                color="gray"
                style={{ touchAction: 'none', cursor: 'grab' }}
                onPointerDown={(event) => onDragStart(row.id, event)}
              >
                <IconGripVertical size={18} />
              </ActionIcon>
            </Tooltip>
          </>
        ) : (
          <ActionIcon
            className="sequence-action-control"
            aria-label="Custom tracks can be reordered in Studio"
            variant="subtle"
            color="gray"
            disabled
          >
            <IconGripVertical size={18} />
          </ActionIcon>
        )}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group gap={6} wrap="wrap">
            <Text fw={650} size="sm">
              {title}
            </Text>
            <Badge size="xs" color={statusColor} variant="light">
              {status}
            </Badge>
            {action?.timing.startMode === 'withPrevious' && (
              <Badge size="xs" color="blue" variant="outline">
                Simultaneous group
              </Badge>
            )}
          </Group>
          <Text size="xs" c="dimmed" truncate>
            {row.targetSummary}
          </Text>
        </Box>
        <Switch
          size="sm"
          aria-label={`${enabled ? 'Disable' : 'Enable'} ${title}`}
          checked={enabled}
          disabled={action?.status === 'detached'}
          onChange={(event) =>
            onToggleEnabled(row, event.currentTarget.checked)
          }
        />
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={4} mt="xs">
        <Text size="xs">
          <Text span c="dimmed">
            Start:{' '}
          </Text>
          {startRelationship} at {startMs} ms
        </Text>
        <Text size="xs">
          <Text span c="dimmed">
            Speed:{' '}
          </Text>
          {duration}
        </Text>
        <Text size="xs">
          <Text span c="dimmed">
            Delay/stagger:{' '}
          </Text>
          {stagger}
        </Text>
        <Text size="xs">
          <Text span c="dimmed">
            Easing:{' '}
          </Text>
          {easing}
        </Text>
      </SimpleGrid>

      <Text
        id={`sequence-description-${row.id}`}
        size="xs"
        c={row.invalidTargetIds.length > 0 ? 'red' : 'dimmed'}
        mt={4}
      >
        {row.invalidTargetIds.length > 0
          ? `${row.invalidTargetIds.length} target reference${row.invalidTargetIds.length === 1 ? '' : 's'} missing. The row was preserved.`
          : isCustomized
            ? 'Customized content is preserved and will not be recompiled.'
            : row.kind === 'custom'
              ? 'Unmanaged timeline content is preserved exactly.'
              : `Runs from ${startMs} ms to ${endMs} ms.`}
      </Text>

      <Group mt="xs" gap="xs" wrap="wrap">
        <Button
          size="compact-xs"
          variant="subtle"
          onClick={() => onExpanded(row.id, !expanded)}
        >
          {expanded ? 'Hide exact' : 'Exact timing'}
        </Button>
        <Button
          size="compact-xs"
          variant="subtle"
          leftSection={<IconPlayerPlay size={14} aria-hidden="true" />}
          disabled={isDetached}
          onClick={() => {
            if (shouldPreviewAction(reducedMotion, 'explicit')) {
              onPreview(startMs);
            }
          }}
        >
          Preview
        </Button>
        {row.kind === 'action' && (
          <Menu withinPortal position="bottom-end">
            <Menu.Target>
              <Button
                size="compact-xs"
                variant="subtle"
                rightSection={<IconChevronDown size={13} />}
              >
                Move
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconArrowUp size={14} />}
                disabled={actionIndex <= 0}
                onClick={() => onMove(row.id, 'up')}
              >
                Move up
              </Menu.Item>
              <Menu.Item
                leftSection={<IconArrowDown size={14} />}
                disabled={actionIndex < 0 || actionIndex >= actionCount - 1}
                onClick={() => onMove(row.id, 'down')}
              >
                Move down
              </Menu.Item>
              <Menu.Item
                disabled={actionIndex <= 0}
                onClick={() => onMove(row.id, 'top')}
              >
                Move to top
              </Menu.Item>
              <Menu.Item
                disabled={actionIndex < 0 || actionIndex >= actionCount - 1}
                onClick={() => onMove(row.id, 'bottom')}
              >
                Move to bottom
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
        <Tooltip
          label={
            isCustomized
              ? 'Duplicate the exact custom tracks from their Studio rows'
              : 'Duplicate row'
          }
        >
          <Button
            size="compact-xs"
            variant="subtle"
            leftSection={<IconCopy size={14} aria-hidden="true" />}
            disabled={isCustomized}
            onClick={() => onDuplicate(row)}
          >
            Duplicate
          </Button>
        </Tooltip>
        <Button
          size="compact-xs"
          variant="subtle"
          onClick={() => onOpenStudio(row)}
        >
          Open in Studio
        </Button>
        <ActionIcon
          className="sequence-action-control"
          aria-label={`Delete ${title}`}
          variant="subtle"
          color="red"
          onClick={() => onDelete(row)}
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Group>

      <Collapse in={expanded}>
        {action && !isCustomized ? (
          <ExactTimingEditor
            action={action}
            disabled={!canEditTiming}
            onApply={(timing, nextEasing) =>
              onTiming(action, timing, nextEasing)
            }
          />
        ) : (
          <Paper withBorder radius="sm" p="xs" mt="xs">
            <Text size="xs">
              {action?.status === 'customized'
                ? `Canonical customized content starts at ${startMs} ms and ends at ${endMs} ms. Edit exact keyframes in Studio.`
                : action?.status === 'detached'
                  ? 'This action is detached. Its exact content is listed in the unmanaged custom track rows.'
                  : `Track starts at ${startMs} ms and ends at ${endMs} ms. Edit exact keyframes in Studio.`}
            </Text>
          </Paper>
        )}
      </Collapse>
    </Paper>
  );
});

function ExactTimingEditor({
  action,
  disabled,
  onApply,
}: {
  action: AnimationAction;
  disabled: boolean;
  onApply: (timing: AnimationActionTiming, easing: EasingType) => void;
}) {
  const [timing, setTiming] = useState(action.timing);
  const [easing, setEasing] = useState<EasingType>(action.easing);
  const speed = getFriendlySpeed(timing.durationMs);

  useEffect(() => {
    setTiming(action.timing);
    setEasing(action.easing);
  }, [action]);

  const setNumber = (
    key: keyof Pick<
      AnimationActionTiming,
      'startMs' | 'durationMs' | 'staggerMs'
    >,
    value: string | number,
  ) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return;
    setTiming((current) => ({ ...current, [key]: value }));
  };

  const apply = () => {
    if (
      timing.startMs < 0 ||
      timing.durationMs <= 0 ||
      timing.staggerMs < 0
    ) {
      notifications.show({
        color: 'red',
        title: 'Invalid timing',
        message:
          'Start and stagger must be at least 0 ms, and duration must be greater than 0 ms.',
      });
      return;
    }
    onApply(timing, easing);
  };

  return (
    <Paper withBorder radius="sm" p="xs" mt="xs">
      <Stack gap="xs">
        <Box>
          <Text size="xs" fw={600} mb={4}>
            Start relationship
          </Text>
          <SegmentedControl
            fullWidth
            size="xs"
            disabled={disabled}
            value={timing.startMode}
            onChange={(value) =>
              setTiming((current) => ({
                ...current,
                startMode: value as AnimationActionTiming['startMode'],
              }))
            }
            data={[
              { value: 'afterPrevious', label: 'After' },
              { value: 'withPrevious', label: 'With' },
              { value: 'absolute', label: 'At time' },
            ]}
          />
        </Box>
        <Box>
          <Text size="xs" fw={600} mb={4}>
            Friendly speed
          </Text>
          <SegmentedControl
            fullWidth
            size="xs"
            disabled={disabled}
            value={speed}
            onChange={(value) =>
              setTiming((current) => ({
                ...current,
                durationMs:
                  SPEED_DURATION_MS[value as FriendlySpeed] ??
                  current.durationMs,
              }))
            }
            data={[
              { value: 'fast', label: 'Fast' },
              { value: 'normal', label: 'Normal' },
              { value: 'slow', label: 'Slow' },
              ...(speed === 'custom'
                ? [{ value: 'custom', label: 'Custom', disabled: true }]
                : []),
            ]}
          />
        </Box>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <NumberInput
            label="Start offset"
            suffix=" ms"
            min={0}
            allowDecimal={false}
            disabled={disabled}
            value={timing.startMs}
            onChange={(value) => setNumber('startMs', value)}
          />
          <NumberInput
            label="Duration"
            suffix=" ms"
            min={1}
            allowDecimal={false}
            disabled={disabled}
            value={timing.durationMs}
            onChange={(value) => setNumber('durationMs', value)}
          />
          <NumberInput
            label="Delay/stagger"
            suffix=" ms"
            min={0}
            allowDecimal={false}
            disabled={disabled}
            value={timing.staggerMs}
            onChange={(value) => setNumber('staggerMs', value)}
          />
          <Select
            label="Easing"
            disabled={disabled}
            value={easing}
            data={EASING_TYPES.map((value) => ({ value, label: value }))}
            onChange={(value) => {
              if (value) setEasing(value as EasingType);
            }}
          />
        </SimpleGrid>
        {disabled ? (
          <Text size="xs" c="yellow">
            Exact values are read-only because this action was customized in
            Studio.
          </Text>
        ) : (
          <Button size="compact-sm" onClick={apply}>
            Apply exact timing
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
