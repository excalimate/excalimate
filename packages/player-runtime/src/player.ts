import {
  compileTimeline,
  computeCompiledFrame,
} from '@excalimate/animation-core';
import type {
  CompiledTimeline,
  FrameState,
  GroupHierarchy,
} from '@excalimate/animation-core';
import { parsePlayerPackage } from './package.js';
import { SvgSceneAdapter } from './svgAdapter.js';
import {
  PLAYER_PACKAGE_LIMITS,
} from './types.js';
import type {
  PlayerPackageV1,
  PlayerSceneAdapter,
  PlayerState,
  PlayerStateListener,
  PlayerTimingDriver,
} from './types.js';

export class CompiledTimelineAdapter {
  private readonly compiled: CompiledTimeline;
  private readonly hierarchyOrder: readonly string[];
  private readonly playerPackage: PlayerPackageV1;

  constructor(playerPackage: PlayerPackageV1) {
    this.playerPackage = playerPackage;
    this.compiled = compileTimeline(playerPackage.animation.timeline, 1);
    this.hierarchyOrder = compileHierarchyOrderLinear(
      playerPackage.animation.hierarchy,
    );
  }

  frameAt(absoluteTimeMs: number): FrameState {
    return computeCompiledFrame(
      this.compiled,
      absoluteTimeMs,
      this.playerPackage.animation.hierarchy,
      this.hierarchyOrder,
    );
  }
}

function compileHierarchyOrderLinear(
  hierarchy: GroupHierarchy,
): readonly string[] {
  const groups = Object.keys(hierarchy);
  const groupSet = new Set(groups);
  const parentByGroup = new Map<string, string>();
  for (const [parentId, members] of Object.entries(hierarchy)) {
    for (const memberId of members) {
      if (groupSet.has(memberId)) parentByGroup.set(memberId, parentId);
    }
  }
  const depthByGroup = new Map<string, number>();
  const getDepth = (groupId: string): number => {
    const cached = depthByGroup.get(groupId);
    if (cached !== undefined) return cached;
    const parentId = parentByGroup.get(groupId);
    const depth = parentId ? getDepth(parentId) + 1 : 0;
    depthByGroup.set(groupId, depth);
    return depth;
  };
  return groups.sort(
    (left, right) =>
      getDepth(left) - getDepth(right) || left.localeCompare(right),
  );
}

export interface PlayerRuntimeOptions {
  container?: Element;
  sceneAdapter?: PlayerSceneAdapter;
  timing?: PlayerTimingDriver;
}

export class PlayerRuntime {
  readonly playerPackage: PlayerPackageV1;
  private readonly timeline: CompiledTimelineAdapter;
  private readonly scene: PlayerSceneAdapter;
  private readonly timing: PlayerTimingDriver;
  private readonly listeners = new Set<PlayerStateListener>();
  private state: PlayerState;
  private frameHandle: number | null = null;
  private previousTimestamp = 0;
  private destroyed = false;

  constructor(playerPackage: PlayerPackageV1, options: PlayerRuntimeOptions) {
    this.playerPackage = parsePlayerPackage(playerPackage);
    this.timeline = new CompiledTimelineAdapter(this.playerPackage);
    if (options.sceneAdapter) {
      this.scene = options.sceneAdapter;
    } else if (options.container) {
      this.scene = new SvgSceneAdapter(options.container, this.playerPackage);
    } else {
      throw new Error('Player runtime requires a scene adapter or container');
    }
    this.timing = options.timing ?? browserTimingDriver();
    this.state = {
      currentTimeMs: 0,
      durationMs:
        this.playerPackage.playback.clipEnd -
        this.playerPackage.playback.clipStart,
      rate: 1,
      playing: false,
      ended: false,
    };
    this.applyCurrentFrame();
  }

  getState(): Readonly<PlayerState> {
    return { ...this.state };
  }

  subscribe(listener: PlayerStateListener): () => void {
    this.assertActive();
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  play(): void {
    this.assertActive();
    if (this.state.playing) return;
    if (this.state.ended) this.seek(0);
    this.state = { ...this.state, playing: true, ended: false };
    this.previousTimestamp = this.timing.now();
    this.scheduleFrame();
    this.emit();
  }

  pause(): void {
    this.assertActive();
    if (!this.state.playing) return;
    this.cancelFrame();
    this.state = { ...this.state, playing: false };
    this.emit();
  }

  seek(timeMs: number): void {
    this.assertActive();
    if (!Number.isFinite(timeMs)) throw new Error('Seek time must be finite');
    const currentTimeMs = clamp(timeMs, 0, this.state.durationMs);
    this.state = {
      ...this.state,
      currentTimeMs,
      ended: currentTimeMs >= this.state.durationMs,
    };
    if (this.state.playing) this.previousTimestamp = this.timing.now();
    this.applyCurrentFrame();
    this.emit();
  }

  setRate(rate: number): void {
    this.assertActive();
    if (
      !Number.isFinite(rate) ||
      rate < PLAYER_PACKAGE_LIMITS.minRate ||
      rate > PLAYER_PACKAGE_LIMITS.maxRate
    ) {
      throw new Error(
        `Playback rate must be between ${PLAYER_PACKAGE_LIMITS.minRate} and ${PLAYER_PACKAGE_LIMITS.maxRate}`,
      );
    }
    this.state = { ...this.state, rate };
    if (this.state.playing) this.previousTimestamp = this.timing.now();
    this.emit();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.cancelFrame();
    this.destroyed = true;
    this.listeners.clear();
    this.scene.destroy();
  }

  private scheduleFrame(): void {
    this.frameHandle = this.timing.request((timestamp) => this.tick(timestamp));
  }

  private tick(timestamp: number): void {
    if (!this.state.playing || this.destroyed) return;
    const delta = Math.max(0, timestamp - this.previousTimestamp) * this.state.rate;
    this.previousTimestamp = timestamp;
    const currentTimeMs = Math.min(
      this.state.durationMs,
      this.state.currentTimeMs + delta,
    );
    const ended = currentTimeMs >= this.state.durationMs;
    this.state = {
      ...this.state,
      currentTimeMs,
      playing: !ended,
      ended,
    };
    this.applyCurrentFrame();
    this.emit();
    if (!ended) this.scheduleFrame();
    else this.frameHandle = null;
  }

  private applyCurrentFrame(): void {
    const absoluteTime =
      this.playerPackage.playback.clipStart + this.state.currentTimeMs;
    this.scene.applyFrame(this.timeline.frameAt(absoluteTime));
  }

  private emit(): void {
    const snapshot = this.getState();
    for (const listener of this.listeners) listener(snapshot);
  }

  private cancelFrame(): void {
    if (this.frameHandle === null) return;
    this.timing.cancel(this.frameHandle);
    this.frameHandle = null;
  }

  private assertActive(): void {
    if (this.destroyed) throw new Error('Player runtime is destroyed');
  }
}

function browserTimingDriver(): PlayerTimingDriver {
  if (
    typeof requestAnimationFrame !== 'function' ||
    typeof cancelAnimationFrame !== 'function'
  ) {
    throw new Error('Animation timing is unavailable in this environment');
  }
  return {
    now: () => performance.now(),
    request: (callback) => requestAnimationFrame(callback),
    cancel: (handle) => cancelAnimationFrame(handle),
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
