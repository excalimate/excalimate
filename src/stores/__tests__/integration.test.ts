import { describe, it, expect, beforeEach } from 'vitest';
import { useAnimationStore } from '../animationStore';
import { useProjectStore } from '../projectStore';

describe('Store Integration', () => {
  beforeEach(() => {
    // Reset stores
    useAnimationStore.setState({
      timeline: { id: 'test', name: 'Test', duration: 5000, fps: 60, tracks: [] },
      selectedTrackId: null,
      selectedKeyframeIds: [],
      clipboardKeyframes: [],
    });
  });

  it('full workflow: add track → add keyframes → copy/paste', () => {
    const store = useAnimationStore.getState();

    // Add track
    store.addTrack('elem1', 'element', 'opacity');
    const tracks = useAnimationStore.getState().timeline.tracks;
    expect(tracks).toHaveLength(1);
    const trackId = tracks[0].id;

    // Add keyframes
    store.addKeyframe(trackId, 0, 0);
    store.addKeyframe(trackId, 1000, 1);

    const updatedTrack = useAnimationStore.getState().timeline.tracks[0];
    expect(updatedTrack.keyframes).toHaveLength(2);
    expect(updatedTrack.keyframes[0].time).toBe(0);
    expect(updatedTrack.keyframes[1].time).toBe(1000);

    // Select and copy
    const kfIds = updatedTrack.keyframes.map(kf => kf.id);
    store.selectKeyframes(kfIds);
    store.copySelectedKeyframes();

    // Paste with offset
    store.pasteKeyframes(trackId, 2000);
    const finalTrack = useAnimationStore.getState().timeline.tracks[0];
    expect(finalTrack.keyframes).toHaveLength(4);
    expect(finalTrack.keyframes[2].time).toBe(2000);
    expect(finalTrack.keyframes[3].time).toBe(3000);
  });

  it('track removal cleans up selection', () => {
    const store = useAnimationStore.getState();
    store.addTrack('elem1', 'element', 'opacity');
    const trackId = useAnimationStore.getState().timeline.tracks[0].id;
    store.selectTrack(trackId);
    expect(useAnimationStore.getState().selectedTrackId).toBe(trackId);

    store.removeTrack(trackId);
    expect(useAnimationStore.getState().selectedTrackId).toBeNull();
    expect(useAnimationStore.getState().timeline.tracks).toHaveLength(0);
  });

  it('project store creates project with scene data', () => {
    const pStore = useProjectStore.getState();
    pStore.createNewProject('Test Anim', {
      elements: [{ id: 'el1', type: 'rectangle', x: 0, y: 0, width: 100, height: 100, isDeleted: false } as any],
      appState: {},
      files: {},
    });

    const project = useProjectStore.getState().project;
    expect(project).not.toBeNull();
    expect(project!.name).toBe('Test Anim');
    expect(project!.scene.elements).toHaveLength(1);
  });
});
