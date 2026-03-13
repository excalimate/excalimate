import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '../projectStore';
import { useAnimationStore } from '../animationStore';
import { usePlaybackStore } from '../playbackStore';
import { useUIStore } from '../uiStore';
import type { ExcalidrawSceneData, AnimatableTarget } from '../../types/excalidraw';
import { createProject } from '../../core/models/Project';
import { createTimeline } from '../../core/models/Timeline';
import type { ElementAnimationState } from '../../types/animation';

const mockScene: ExcalidrawSceneData = {
  elements: [],
  appState: {},
  files: {},
};

const mockTarget: AnimatableTarget = {
  id: 'el-1',
  type: 'element',
  label: 'Rectangle',
  elementIds: ['el-1'],
  originalBounds: { x: 0, y: 0, width: 100, height: 100, centerX: 50, centerY: 50 },
  originalAngle: 0,
  zIndex: 0,
};

const mockGroupTarget: AnimatableTarget = {
  id: 'grp-1',
  type: 'group',
  label: 'Group 1',
  elementIds: ['el-1', 'el-2'],
  originalBounds: { x: 0, y: 0, width: 200, height: 200, centerX: 100, centerY: 100 },
  originalAngle: 0,
  zIndex: 1,
};

// ─── Project Store ──────────────────────────────────────────────────────────

describe('projectStore', () => {
  beforeEach(() => {
    useProjectStore.setState({
      project: null,
      targets: [],
      isDirty: false,
    });
  });

  it('should initialize with null project', () => {
    const state = useProjectStore.getState();
    expect(state.project).toBeNull();
    expect(state.targets).toEqual([]);
    expect(state.isDirty).toBe(false);
  });

  it('should create a new project', () => {
    useProjectStore.getState().createNewProject('Test', mockScene);
    const state = useProjectStore.getState();
    expect(state.project).not.toBeNull();
    expect(state.project!.name).toBe('Test');
    expect(state.isDirty).toBe(false);
  });

  it('should load an existing project', () => {
    const project = createProject('Loaded', mockScene);
    useProjectStore.getState().loadProject(project);
    const state = useProjectStore.getState();
    expect(state.project!.id).toBe(project.id);
    expect(state.isDirty).toBe(false);
  });

  it('should update project name and mark dirty', () => {
    useProjectStore.getState().createNewProject('Original', mockScene);
    useProjectStore.getState().updateProjectName('Updated');
    const state = useProjectStore.getState();
    expect(state.project!.name).toBe('Updated');
    expect(state.isDirty).toBe(true);
  });

  it('should set and query targets', () => {
    useProjectStore.getState().setTargets([mockTarget, mockGroupTarget]);
    const state = useProjectStore.getState();
    expect(state.targets).toHaveLength(2);
    expect(state.getTarget('el-1')).toEqual(mockTarget);
    expect(state.getElementTargets()).toHaveLength(1);
    expect(state.getGroupTargets()).toHaveLength(1);
  });

  it('should mark clean', () => {
    useProjectStore.getState().createNewProject('Test', mockScene);
    useProjectStore.getState().updateProjectName('Dirty');
    expect(useProjectStore.getState().isDirty).toBe(true);
    useProjectStore.getState().markClean();
    expect(useProjectStore.getState().isDirty).toBe(false);
  });
});

// ─── Animation Store ────────────────────────────────────────────────────────

describe('animationStore', () => {
  beforeEach(() => {
    useAnimationStore.setState({
      timeline: createTimeline(),
      selectedTrackId: null,
      selectedKeyframeIds: [],
      clipboardKeyframes: [],
    });
  });

  it('should initialize with a default timeline', () => {
    const state = useAnimationStore.getState();
    expect(state.timeline.name).toBe('Animation 1');
    expect(state.timeline.duration).toBe(30000);
    expect(state.timeline.fps).toBe(60);
    expect(state.timeline.tracks).toHaveLength(0);
  });

  it('should add a track', () => {
    useAnimationStore.getState().addTrack('el-1', 'element', 'opacity');
    const tracks = useAnimationStore.getState().timeline.tracks;
    expect(tracks).toHaveLength(1);
    expect(tracks[0].targetId).toBe('el-1');
    expect(tracks[0].property).toBe('opacity');
    expect(tracks[0].enabled).toBe(true);
  });

  it('should remove a track', () => {
    useAnimationStore.getState().addTrack('el-1', 'element', 'opacity');
    const trackId = useAnimationStore.getState().timeline.tracks[0].id;
    useAnimationStore.getState().removeTrack(trackId);
    expect(useAnimationStore.getState().timeline.tracks).toHaveLength(0);
  });

  it('should toggle track enabled', () => {
    useAnimationStore.getState().addTrack('el-1', 'element', 'opacity');
    const trackId = useAnimationStore.getState().timeline.tracks[0].id;
    useAnimationStore.getState().toggleTrackEnabled(trackId);
    expect(useAnimationStore.getState().timeline.tracks[0].enabled).toBe(false);
    useAnimationStore.getState().toggleTrackEnabled(trackId);
    expect(useAnimationStore.getState().timeline.tracks[0].enabled).toBe(true);
  });

  it('should select and deselect a track', () => {
    useAnimationStore.getState().addTrack('el-1', 'element', 'opacity');
    const trackId = useAnimationStore.getState().timeline.tracks[0].id;
    useAnimationStore.getState().selectTrack(trackId);
    expect(useAnimationStore.getState().selectedTrackId).toBe(trackId);
    expect(useAnimationStore.getState().getSelectedTrack()?.id).toBe(trackId);
    useAnimationStore.getState().selectTrack(null);
    expect(useAnimationStore.getState().selectedTrackId).toBeNull();
    expect(useAnimationStore.getState().getSelectedTrack()).toBeUndefined();
  });

  it('should clear selected track when removing it', () => {
    useAnimationStore.getState().addTrack('el-1', 'element', 'opacity');
    const trackId = useAnimationStore.getState().timeline.tracks[0].id;
    useAnimationStore.getState().selectTrack(trackId);
    useAnimationStore.getState().removeTrack(trackId);
    expect(useAnimationStore.getState().selectedTrackId).toBeNull();
  });

  it('should add a keyframe to a track', () => {
    useAnimationStore.getState().addTrack('el-1', 'element', 'opacity');
    const trackId = useAnimationStore.getState().timeline.tracks[0].id;
    useAnimationStore.getState().addKeyframe(trackId, 0, 1);
    useAnimationStore.getState().addKeyframe(trackId, 1000, 0, 'easeInOut');
    const keyframes = useAnimationStore.getState().timeline.tracks[0].keyframes;
    expect(keyframes).toHaveLength(2);
    expect(keyframes[0].time).toBe(0);
    expect(keyframes[1].time).toBe(1000);
    expect(keyframes[1].easing).toBe('easeInOut');
  });

  it('should remove a keyframe', () => {
    useAnimationStore.getState().addTrack('el-1', 'element', 'opacity');
    const trackId = useAnimationStore.getState().timeline.tracks[0].id;
    useAnimationStore.getState().addKeyframe(trackId, 0, 1);
    const kfId = useAnimationStore.getState().timeline.tracks[0].keyframes[0].id;
    useAnimationStore.getState().removeKeyframe(trackId, kfId);
    expect(useAnimationStore.getState().timeline.tracks[0].keyframes).toHaveLength(0);
  });

  it('should update a keyframe', () => {
    useAnimationStore.getState().addTrack('el-1', 'element', 'opacity');
    const trackId = useAnimationStore.getState().timeline.tracks[0].id;
    useAnimationStore.getState().addKeyframe(trackId, 0, 1);
    const kfId = useAnimationStore.getState().timeline.tracks[0].keyframes[0].id;
    useAnimationStore.getState().updateKeyframe(trackId, kfId, { value: 0.5, easing: 'easeOut' });
    const kf = useAnimationStore.getState().timeline.tracks[0].keyframes[0];
    expect(kf.value).toBe(0.5);
    expect(kf.easing).toBe('easeOut');
  });

  it('should move a keyframe and maintain sort order', () => {
    useAnimationStore.getState().addTrack('el-1', 'element', 'opacity');
    const trackId = useAnimationStore.getState().timeline.tracks[0].id;
    useAnimationStore.getState().addKeyframe(trackId, 0, 1);
    useAnimationStore.getState().addKeyframe(trackId, 2000, 0);
    const kfId = useAnimationStore.getState().timeline.tracks[0].keyframes[0].id;
    useAnimationStore.getState().moveKeyframe(trackId, kfId, 3000);
    const keyframes = useAnimationStore.getState().timeline.tracks[0].keyframes;
    expect(keyframes[0].time).toBe(2000);
    expect(keyframes[1].time).toBe(3000);
    expect(keyframes[1].id).toBe(kfId);
  });

  it('should select and clear keyframe selection', () => {
    useAnimationStore.getState().selectKeyframes(['kf-1', 'kf-2']);
    expect(useAnimationStore.getState().selectedKeyframeIds).toEqual(['kf-1', 'kf-2']);
    useAnimationStore.getState().clearKeyframeSelection();
    expect(useAnimationStore.getState().selectedKeyframeIds).toEqual([]);
  });

  it('should copy and paste keyframes', () => {
    useAnimationStore.getState().addTrack('el-1', 'element', 'opacity');
    const trackId = useAnimationStore.getState().timeline.tracks[0].id;
    useAnimationStore.getState().addKeyframe(trackId, 0, 1);
    useAnimationStore.getState().addKeyframe(trackId, 500, 0.5);
    const kfIds = useAnimationStore.getState().timeline.tracks[0].keyframes.map((kf) => kf.id);
    useAnimationStore.getState().selectKeyframes(kfIds);
    useAnimationStore.getState().copySelectedKeyframes();
    expect(useAnimationStore.getState().clipboardKeyframes).toHaveLength(2);

    // Paste with offset
    useAnimationStore.getState().pasteKeyframes(trackId, 1000);
    const keyframes = useAnimationStore.getState().timeline.tracks[0].keyframes;
    expect(keyframes).toHaveLength(4);
    expect(keyframes.some((kf) => kf.time === 1000)).toBe(true);
    expect(keyframes.some((kf) => kf.time === 1500)).toBe(true);
  });

  it('should set timeline duration and fps', () => {
    useAnimationStore.getState().setTimelineDuration(10000);
    expect(useAnimationStore.getState().timeline.duration).toBe(10000);
    useAnimationStore.getState().setTimelineFps(30);
    expect(useAnimationStore.getState().timeline.fps).toBe(30);
  });

  it('should get tracks for a target', () => {
    useAnimationStore.getState().addTrack('el-1', 'element', 'opacity');
    useAnimationStore.getState().addTrack('el-1', 'element', 'translateX');
    useAnimationStore.getState().addTrack('el-2', 'element', 'opacity');
    const tracks = useAnimationStore.getState().getTracksForTarget('el-1');
    expect(tracks).toHaveLength(2);
  });

  it('should remove keyframe from selection when keyframe is deleted', () => {
    useAnimationStore.getState().addTrack('el-1', 'element', 'opacity');
    const trackId = useAnimationStore.getState().timeline.tracks[0].id;
    useAnimationStore.getState().addKeyframe(trackId, 0, 1);
    const kfId = useAnimationStore.getState().timeline.tracks[0].keyframes[0].id;
    useAnimationStore.getState().selectKeyframes([kfId]);
    useAnimationStore.getState().removeKeyframe(trackId, kfId);
    expect(useAnimationStore.getState().selectedKeyframeIds).not.toContain(kfId);
  });
});

// ─── Playback Store ─────────────────────────────────────────────────────────

describe('playbackStore', () => {
  beforeEach(() => {
    usePlaybackStore.setState({
      currentTime: 0,
      state: 'stopped',
      speed: 1,
      loopMode: 'none',
      frameState: new Map(),
    });
  });

  it('should initialize with default values', () => {
    const state = usePlaybackStore.getState();
    expect(state.currentTime).toBe(0);
    expect(state.state).toBe('stopped');
    expect(state.speed).toBe(1);
    expect(state.loopMode).toBe('none');
    expect(state.frameState.size).toBe(0);
  });

  it('should update playback state and time', () => {
    usePlaybackStore.getState().setCurrentTime(1500);
    usePlaybackStore.getState().setPlaybackState('playing');
    const state = usePlaybackStore.getState();
    expect(state.currentTime).toBe(1500);
    expect(state.state).toBe('playing');
  });

  it('should set speed and loop mode', () => {
    usePlaybackStore.getState().setSpeed(0.5);
    usePlaybackStore.getState().setLoopMode('loop');
    const state = usePlaybackStore.getState();
    expect(state.speed).toBe(0.5);
    expect(state.loopMode).toBe('loop');
  });

  it('should set frame state', () => {
    const frame = new Map<string, ElementAnimationState>();
    frame.set('el-1', {
      targetId: 'el-1',
      opacity: 0.5,
      translateX: 10,
      translateY: 20,
      scaleX: 1,
      scaleY: 1,
      rotation: 45,
    });
    usePlaybackStore.getState().setFrameState(frame);
    expect(usePlaybackStore.getState().frameState.get('el-1')?.opacity).toBe(0.5);
  });
});

// ─── UI Store ───────────────────────────────────────────────────────────────

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      mode: 'edit',
      selectedElementIds: [],
      panelSizes: { leftPanel: 48, rightPanel: 280, bottomPanel: 250 },
      timelineViewport: {
        scrollX: 0,
        scrollY: 0,
        zoom: 0.1,
        snapEnabled: true,
        snapInterval: 100,
      },
    });
  });

  it('should initialize with default values', () => {
    const state = useUIStore.getState();
    expect(state.mode).toBe('edit');
    expect(state.panelSizes.leftPanel).toBe(48);
    expect(state.panelSizes.rightPanel).toBe(280);
    expect(state.panelSizes.bottomPanel).toBe(250);
    expect(state.timelineViewport.zoom).toBe(0.1);
    expect(state.timelineViewport.snapEnabled).toBe(true);
  });

  it('should toggle mode between edit and animate', () => {
    useUIStore.getState().toggleMode();
    expect(useUIStore.getState().mode).toBe('animate');
    useUIStore.getState().toggleMode();
    expect(useUIStore.getState().mode).toBe('edit');
  });

  it('should set mode directly', () => {
    useUIStore.getState().setMode('animate');
    expect(useUIStore.getState().mode).toBe('animate');
  });

  it('should select and clear elements', () => {
    useUIStore.getState().setSelectedElements(['el-1', 'el-2']);
    expect(useUIStore.getState().selectedElementIds).toEqual(['el-1', 'el-2']);
    useUIStore.getState().clearSelection();
    expect(useUIStore.getState().selectedElementIds).toEqual([]);
  });

  it('should update panel sizes individually', () => {
    useUIStore.getState().setPanelSize('rightPanel', 350);
    const sizes = useUIStore.getState().panelSizes;
    expect(sizes.rightPanel).toBe(350);
    expect(sizes.leftPanel).toBe(48);
  });

  it('should update timeline viewport', () => {
    useUIStore.getState().setTimelineZoom(0.5);
    useUIStore.getState().setTimelineScroll(100, 50);
    const vp = useUIStore.getState().timelineViewport;
    expect(vp.zoom).toBe(0.5);
    expect(vp.scrollX).toBe(100);
    expect(vp.scrollY).toBe(50);
  });

  it('should toggle snap and set interval', () => {
    useUIStore.getState().toggleSnap();
    expect(useUIStore.getState().timelineViewport.snapEnabled).toBe(false);
    useUIStore.getState().toggleSnap();
    expect(useUIStore.getState().timelineViewport.snapEnabled).toBe(true);
    useUIStore.getState().setSnapInterval(250);
    expect(useUIStore.getState().timelineViewport.snapInterval).toBe(250);
  });
});
