// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  createKeyframe,
  validateKeyframe,
  sortKeyframes,
  findKeyframeIndex,
  createTrack,
  addKeyframeToTrack,
  removeKeyframeFromTrack,
  updateKeyframeInTrack,
  validateTrack,
  createTimeline,
  addTrackToTimeline,
  removeTrackFromTimeline,
  findTracksForTarget,
  validateTimeline,
  createProject,
  validateProject,
  PROJECT_VERSION,
} from './index';
import type { ExcalidrawSceneData } from '../../types/excalidraw';

function makeScene(): ExcalidrawSceneData {
  return {
    elements: [],
    appState: {},
    files: {},
  };
}

describe('Keyframe', () => {
  describe('createKeyframe', () => {
    it('generates a unique id', () => {
      const kf1 = createKeyframe(0, 1);
      const kf2 = createKeyframe(0, 1);
      expect(kf1.id).toBeTruthy();
      expect(kf2.id).toBeTruthy();
      expect(kf1.id).not.toBe(kf2.id);
    });

    it('sets time and value correctly', () => {
      const kf = createKeyframe(500, 0.5);
      expect(kf.time).toBe(500);
      expect(kf.value).toBe(0.5);
    });

    it('defaults easing to linear', () => {
      const kf = createKeyframe(0, 1);
      expect(kf.easing).toBe('linear');
    });

    it('accepts a custom easing', () => {
      const kf = createKeyframe(0, 1, 'easeInOut');
      expect(kf.easing).toBe('easeInOut');
    });
  });

  describe('validateKeyframe', () => {
    it('returns true for a valid keyframe', () => {
      const kf = createKeyframe(100, 0.5, 'easeOut');
      expect(validateKeyframe(kf)).toBe(true);
    });

    it('returns false for null', () => {
      expect(validateKeyframe(null)).toBe(false);
    });

    it('returns false for non-object', () => {
      expect(validateKeyframe('hello')).toBe(false);
      expect(validateKeyframe(42)).toBe(false);
    });

    it('returns false when id is missing or empty', () => {
      expect(validateKeyframe({ time: 0, value: 1, easing: 'linear' })).toBe(false);
      expect(validateKeyframe({ id: '', time: 0, value: 1, easing: 'linear' })).toBe(false);
    });

    it('returns false for negative time', () => {
      expect(validateKeyframe({ id: 'a', time: -1, value: 1, easing: 'linear' })).toBe(false);
    });

    it('returns false for non-finite time', () => {
      expect(validateKeyframe({ id: 'a', time: Infinity, value: 1, easing: 'linear' })).toBe(false);
      expect(validateKeyframe({ id: 'a', time: NaN, value: 1, easing: 'linear' })).toBe(false);
    });

    it('returns false for non-finite value', () => {
      expect(validateKeyframe({ id: 'a', time: 0, value: Infinity, easing: 'linear' })).toBe(false);
      expect(validateKeyframe({ id: 'a', time: 0, value: NaN, easing: 'linear' })).toBe(false);
    });

    it('returns false for invalid easing', () => {
      expect(validateKeyframe({ id: 'a', time: 0, value: 1, easing: 'invalidEasing' })).toBe(false);
    });

    it('returns false when easing is not a string', () => {
      expect(validateKeyframe({ id: 'a', time: 0, value: 1, easing: 42 })).toBe(false);
    });
  });

  describe('sortKeyframes', () => {
    it('sorts keyframes by time ascending', () => {
      const kf1 = createKeyframe(300, 1);
      const kf2 = createKeyframe(100, 0);
      const kf3 = createKeyframe(200, 0.5);
      const sorted = sortKeyframes([kf1, kf2, kf3]);
      expect(sorted.map((kf) => kf.time)).toEqual([100, 200, 300]);
    });

    it('does not mutate the original array', () => {
      const original = [createKeyframe(200, 1), createKeyframe(100, 0)];
      const sorted = sortKeyframes(original);
      expect(original[0].time).toBe(200);
      expect(sorted[0].time).toBe(100);
    });

    it('handles empty array', () => {
      expect(sortKeyframes([])).toEqual([]);
    });
  });

  describe('findKeyframeIndex', () => {
    it('returns the index of the keyframe with the given id', () => {
      const kfs = [createKeyframe(0, 0), createKeyframe(100, 1), createKeyframe(200, 0.5)];
      expect(findKeyframeIndex(kfs, kfs[1].id)).toBe(1);
    });

    it('returns -1 if not found', () => {
      const kfs = [createKeyframe(0, 0)];
      expect(findKeyframeIndex(kfs, 'nonexistent')).toBe(-1);
    });
  });
});

describe('Track', () => {
  describe('createTrack', () => {
    it('generates a unique id', () => {
      const t1 = createTrack('el-1', 'element', 'opacity');
      const t2 = createTrack('el-1', 'element', 'opacity');
      expect(t1.id).toBeTruthy();
      expect(t1.id).not.toBe(t2.id);
    });

    it('sets correct defaults', () => {
      const track = createTrack('el-1', 'element', 'translateX');
      expect(track.targetId).toBe('el-1');
      expect(track.targetType).toBe('element');
      expect(track.property).toBe('translateX');
      expect(track.keyframes).toEqual([]);
      expect(track.enabled).toBe(true);
    });
  });

  describe('addKeyframeToTrack', () => {
    it('adds a keyframe and maintains sort order', () => {
      let track = createTrack('el-1', 'element', 'opacity');
      const kf1 = createKeyframe(200, 1);
      const kf2 = createKeyframe(100, 0);
      track = addKeyframeToTrack(track, kf1);
      track = addKeyframeToTrack(track, kf2);
      expect(track.keyframes).toHaveLength(2);
      expect(track.keyframes[0].time).toBe(100);
      expect(track.keyframes[1].time).toBe(200);
    });

    it('does not mutate the original track', () => {
      const original = createTrack('el-1', 'element', 'opacity');
      const updated = addKeyframeToTrack(original, createKeyframe(0, 1));
      expect(original.keyframes).toHaveLength(0);
      expect(updated.keyframes).toHaveLength(1);
    });
  });

  describe('removeKeyframeFromTrack', () => {
    it('removes a keyframe by id', () => {
      let track = createTrack('el-1', 'element', 'opacity');
      const kf1 = createKeyframe(0, 0);
      const kf2 = createKeyframe(100, 1);
      track = addKeyframeToTrack(track, kf1);
      track = addKeyframeToTrack(track, kf2);
      const removed = removeKeyframeFromTrack(track, kf1.id);
      expect(removed.keyframes).toHaveLength(1);
      expect(removed.keyframes[0].id).toBe(kf2.id);
    });

    it('returns same keyframes if id not found', () => {
      let track = createTrack('el-1', 'element', 'opacity');
      track = addKeyframeToTrack(track, createKeyframe(0, 1));
      const result = removeKeyframeFromTrack(track, 'nonexistent');
      expect(result.keyframes).toHaveLength(1);
    });
  });

  describe('updateKeyframeInTrack', () => {
    it('updates value of a keyframe', () => {
      let track = createTrack('el-1', 'element', 'opacity');
      const kf = createKeyframe(0, 0);
      track = addKeyframeToTrack(track, kf);
      const updated = updateKeyframeInTrack(track, kf.id, { value: 0.75 });
      expect(updated.keyframes[0].value).toBe(0.75);
      expect(updated.keyframes[0].id).toBe(kf.id);
    });

    it('re-sorts if time is changed', () => {
      let track = createTrack('el-1', 'element', 'opacity');
      const kf1 = createKeyframe(100, 0);
      const kf2 = createKeyframe(200, 1);
      track = addKeyframeToTrack(track, kf1);
      track = addKeyframeToTrack(track, kf2);
      // Move kf1 to time 300 so it should come after kf2
      const updated = updateKeyframeInTrack(track, kf1.id, { time: 300 });
      expect(updated.keyframes[0].id).toBe(kf2.id);
      expect(updated.keyframes[1].id).toBe(kf1.id);
      expect(updated.keyframes[1].time).toBe(300);
    });

    it('updates easing', () => {
      let track = createTrack('el-1', 'element', 'opacity');
      const kf = createKeyframe(0, 1, 'linear');
      track = addKeyframeToTrack(track, kf);
      const updated = updateKeyframeInTrack(track, kf.id, { easing: 'easeInOut' });
      expect(updated.keyframes[0].easing).toBe('easeInOut');
    });
  });

  describe('validateTrack', () => {
    it('returns true for a valid track', () => {
      const track = createTrack('el-1', 'element', 'opacity');
      expect(validateTrack(track)).toBe(true);
    });

    it('returns true for a track with keyframes', () => {
      let track = createTrack('el-1', 'element', 'scaleX');
      track = addKeyframeToTrack(track, createKeyframe(0, 1));
      track = addKeyframeToTrack(track, createKeyframe(100, 2));
      expect(validateTrack(track)).toBe(true);
    });

    it('returns false for null', () => {
      expect(validateTrack(null)).toBe(false);
    });

    it('returns false for missing id', () => {
      expect(
        validateTrack({
          targetId: 'el-1',
          targetType: 'element',
          property: 'opacity',
          keyframes: [],
          enabled: true,
        }),
      ).toBe(false);
    });

    it('returns false for invalid targetType', () => {
      expect(
        validateTrack({
          id: 'a',
          targetId: 'el-1',
          targetType: 'invalid',
          property: 'opacity',
          keyframes: [],
          enabled: true,
        }),
      ).toBe(false);
    });

    it('returns false for invalid property', () => {
      expect(
        validateTrack({
          id: 'a',
          targetId: 'el-1',
          targetType: 'element',
          property: 'color',
          keyframes: [],
          enabled: true,
        }),
      ).toBe(false);
    });

    it('returns false for non-boolean enabled', () => {
      expect(
        validateTrack({
          id: 'a',
          targetId: 'el-1',
          targetType: 'element',
          property: 'opacity',
          keyframes: [],
          enabled: 'yes',
        }),
      ).toBe(false);
    });

    it('returns false if keyframes contains an invalid keyframe', () => {
      expect(
        validateTrack({
          id: 'a',
          targetId: 'el-1',
          targetType: 'element',
          property: 'opacity',
          keyframes: [{ id: 'k', time: -5, value: 1, easing: 'linear' }],
          enabled: true,
        }),
      ).toBe(false);
    });
  });
});

describe('Timeline', () => {
  describe('createTimeline', () => {
    it('generates a unique id', () => {
      const t1 = createTimeline();
      const t2 = createTimeline();
      expect(t1.id).toBeTruthy();
      expect(t1.id).not.toBe(t2.id);
    });

    it('sets correct defaults', () => {
      const tl = createTimeline();
      expect(tl.name).toBe('Animation 1');
      expect(tl.duration).toBe(30000);
      expect(tl.fps).toBe(60);
      expect(tl.tracks).toEqual([]);
    });

    it('accepts custom parameters', () => {
      const tl = createTimeline('My Anim', 10000, 30);
      expect(tl.name).toBe('My Anim');
      expect(tl.duration).toBe(10000);
      expect(tl.fps).toBe(30);
    });
  });

  describe('addTrackToTimeline', () => {
    it('adds a track to the timeline', () => {
      const tl = createTimeline();
      const track = createTrack('el-1', 'element', 'opacity');
      const updated = addTrackToTimeline(tl, track);
      expect(updated.tracks).toHaveLength(1);
      expect(updated.tracks[0].id).toBe(track.id);
    });

    it('does not mutate the original timeline', () => {
      const tl = createTimeline();
      addTrackToTimeline(tl, createTrack('el-1', 'element', 'opacity'));
      expect(tl.tracks).toHaveLength(0);
    });
  });

  describe('removeTrackFromTimeline', () => {
    it('removes a track by id', () => {
      const tl = createTimeline();
      const track1 = createTrack('el-1', 'element', 'opacity');
      const track2 = createTrack('el-2', 'element', 'translateX');
      let updated = addTrackToTimeline(tl, track1);
      updated = addTrackToTimeline(updated, track2);
      const result = removeTrackFromTimeline(updated, track1.id);
      expect(result.tracks).toHaveLength(1);
      expect(result.tracks[0].id).toBe(track2.id);
    });
  });

  describe('findTracksForTarget', () => {
    it('returns tracks matching the target id', () => {
      let tl = createTimeline();
      tl = addTrackToTimeline(tl, createTrack('el-1', 'element', 'opacity'));
      tl = addTrackToTimeline(tl, createTrack('el-1', 'element', 'translateX'));
      tl = addTrackToTimeline(tl, createTrack('el-2', 'element', 'opacity'));
      const found = findTracksForTarget(tl, 'el-1');
      expect(found).toHaveLength(2);
      expect(found.every((t) => t.targetId === 'el-1')).toBe(true);
    });

    it('returns empty array if no tracks match', () => {
      const tl = createTimeline();
      expect(findTracksForTarget(tl, 'nonexistent')).toEqual([]);
    });
  });

  describe('validateTimeline', () => {
    it('returns true for a valid timeline', () => {
      const tl = createTimeline();
      expect(validateTimeline(tl)).toBe(true);
    });

    it('returns true for a timeline with valid tracks', () => {
      let tl = createTimeline();
      tl = addTrackToTimeline(tl, createTrack('el-1', 'element', 'opacity'));
      expect(validateTimeline(tl)).toBe(true);
    });

    it('returns false for null', () => {
      expect(validateTimeline(null)).toBe(false);
    });

    it('returns false for missing id', () => {
      expect(
        validateTimeline({ name: 'Test', duration: 5000, fps: 60, tracks: [] }),
      ).toBe(false);
    });

    it('returns false for non-positive duration', () => {
      expect(
        validateTimeline({ id: 'a', name: 'Test', duration: 0, fps: 60, tracks: [] }),
      ).toBe(false);
      expect(
        validateTimeline({ id: 'a', name: 'Test', duration: -100, fps: 60, tracks: [] }),
      ).toBe(false);
    });

    it('returns false for non-positive fps', () => {
      expect(
        validateTimeline({ id: 'a', name: 'Test', duration: 5000, fps: 0, tracks: [] }),
      ).toBe(false);
    });

    it('returns false if tracks contain invalid track', () => {
      expect(
        validateTimeline({
          id: 'a',
          name: 'Test',
          duration: 5000,
          fps: 60,
          tracks: [{ id: 'bad' }],
        }),
      ).toBe(false);
    });
  });
});

describe('Project', () => {
  describe('createProject', () => {
    it('generates a unique id', () => {
      const p1 = createProject('Project 1', makeScene());
      const p2 = createProject('Project 2', makeScene());
      expect(p1.id).toBeTruthy();
      expect(p1.id).not.toBe(p2.id);
    });

    it('sets version, name, scene, and timestamps', () => {
      const scene = makeScene();
      const project = createProject('My Project', scene);
      expect(project.version).toBe(PROJECT_VERSION);
      expect(project.name).toBe('My Project');
      expect(project.scene).toBe(scene);
      expect(project.createdAt).toBeTruthy();
      expect(project.updatedAt).toBeTruthy();
      // Timestamps should be valid ISO strings
      expect(() => new Date(project.createdAt)).not.toThrow();
      expect(new Date(project.createdAt).toISOString()).toBe(project.createdAt);
    });

    it('creates a default timeline', () => {
      const project = createProject('Test', makeScene());
      expect(project.timeline).toBeDefined();
      expect(project.timeline.name).toBe('Animation 1');
      expect(project.timeline.tracks).toEqual([]);
    });
  });

  describe('validateProject', () => {
    it('returns true for a valid project', () => {
      const project = createProject('Test', makeScene());
      expect(validateProject(project)).toBe(true);
    });

    it('returns false for null', () => {
      expect(validateProject(null)).toBe(false);
    });

    it('returns false for missing id', () => {
      const project = createProject('Test', makeScene());
      const { id: _id, ...rest } = project;
      expect(validateProject(rest)).toBe(false);
    });

    it('returns false for invalid scene', () => {
      expect(
        validateProject({
          id: 'a',
          version: '1.0.0',
          name: 'Test',
          scene: null,
          timeline: createTimeline(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      ).toBe(false);
    });

    it('returns false for scene missing elements', () => {
      expect(
        validateProject({
          id: 'a',
          version: '1.0.0',
          name: 'Test',
          scene: { appState: {}, files: {} },
          timeline: createTimeline(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      ).toBe(false);
    });

    it('returns false for invalid timeline', () => {
      expect(
        validateProject({
          id: 'a',
          version: '1.0.0',
          name: 'Test',
          scene: makeScene(),
          timeline: { id: 'bad' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      ).toBe(false);
    });

    it('returns false for missing version', () => {
      expect(
        validateProject({
          id: 'a',
          name: 'Test',
          scene: makeScene(),
          timeline: createTimeline(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      ).toBe(false);
    });
  });
});
