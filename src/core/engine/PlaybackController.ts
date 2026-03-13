/**
 * Playback controller for animation timeline.
 * Uses requestAnimationFrame for smooth frame scheduling.
 * Tracks elapsed time with high-precision performance.now().
 */

import type { LoopMode, PlaybackSpeed, PlaybackState } from '../../types/ui';

export type FrameCallback = (currentTime: number) => void;
export type StateChangeCallback = (state: PlaybackState) => void;

export class PlaybackController {
  private _state: PlaybackState = 'stopped';
  private _currentTime: number = 0;
  private _duration: number = 30000;
  private _speed: PlaybackSpeed = 1;
  private _loopMode: LoopMode = 'none';
  private _rafId: number | null = null;
  private _lastFrameTimestamp: number = 0;
  private _direction: 1 | -1 = 1; // For ping-pong
  private _frameCallbacks: Set<FrameCallback> = new Set();
  private _stateChangeCallbacks: Set<StateChangeCallback> = new Set();

  constructor(duration: number = 30000) {
    this._duration = duration;
  }

  // --- Public getters ---

  get state(): PlaybackState {
    return this._state;
  }

  get currentTime(): number {
    return this._currentTime;
  }

  get duration(): number {
    return this._duration;
  }

  get speed(): PlaybackSpeed {
    return this._speed;
  }

  get loopMode(): LoopMode {
    return this._loopMode;
  }

  get isPlaying(): boolean {
    return this._state === 'playing';
  }

  get progress(): number {
    return this._duration > 0 ? this._currentTime / this._duration : 0;
  }

  // --- Configuration ---

  setDuration(duration: number): void {
    this._duration = Math.max(0, duration);
    if (this._currentTime > this._duration) {
      this._currentTime = this._duration;
    }
  }

  setSpeed(speed: PlaybackSpeed): void {
    this._speed = speed;
  }

  setLoopMode(mode: LoopMode): void {
    this._loopMode = mode;
    this._direction = 1;
  }

  // --- Playback control ---

  play(): void {
    if (this._state === 'playing') return;

    // If at end, restart from beginning
    if (this._currentTime >= this._duration) {
      this._currentTime = 0;
      this._direction = 1;
    }

    this._setState('playing');
    this._lastFrameTimestamp = performance.now();
    this._scheduleFrame();
  }

  pause(): void {
    if (this._state !== 'playing') return;
    this._cancelFrame();
    this._setState('paused');
  }

  stop(): void {
    this._cancelFrame();
    this._currentTime = 0;
    this._direction = 1;
    this._setState('stopped');
    this._emitFrame();
  }

  togglePlayPause(): void {
    if (this._state === 'playing') {
      this.pause();
    } else {
      this.play();
    }
  }

  seek(time: number): void {
    this._currentTime = Math.max(0, Math.min(time, this._duration));
    this._emitFrame();
  }

  /**
   * Set internal current time without emitting frame callbacks.
   * Used by computeFrameAtTime to sync the controller's position
   * without triggering redundant frame computations.
   */
  seekSilent(time: number): void {
    this._currentTime = Math.max(0, Math.min(time, this._duration));
  }

  seekToStart(): void {
    this.seek(0);
  }

  seekToEnd(): void {
    this.seek(this._duration);
  }

  /**
   * Step forward by one frame at the given FPS.
   */
  stepForward(fps: number = 60): void {
    const frameDuration = 1000 / fps;
    this.seek(Math.min(this._currentTime + frameDuration, this._duration));
  }

  /**
   * Step backward by one frame at the given FPS.
   */
  stepBackward(fps: number = 60): void {
    const frameDuration = 1000 / fps;
    this.seek(Math.max(this._currentTime - frameDuration, 0));
  }

  // --- Callbacks ---

  onFrame(callback: FrameCallback): () => void {
    this._frameCallbacks.add(callback);
    return () => this._frameCallbacks.delete(callback);
  }

  onStateChange(callback: StateChangeCallback): () => void {
    this._stateChangeCallbacks.add(callback);
    return () => this._stateChangeCallbacks.delete(callback);
  }

  // --- Cleanup ---

  destroy(): void {
    this._cancelFrame();
    this._frameCallbacks.clear();
    this._stateChangeCallbacks.clear();
    this._state = 'stopped';
    this._currentTime = 0;
  }

  // --- Internal ---

  private _scheduleFrame(): void {
    this._rafId = requestAnimationFrame((timestamp) => this._tick(timestamp));
  }

  private _cancelFrame(): void {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  private _tick(timestamp: number): void {
    if (this._state !== 'playing') return;

    const delta = (timestamp - this._lastFrameTimestamp) * this._speed * this._direction;
    this._lastFrameTimestamp = timestamp;
    this._currentTime += delta;

    // Handle timeline boundaries
    if (this._currentTime >= this._duration) {
      switch (this._loopMode) {
        case 'none':
          this._currentTime = this._duration;
          this._emitFrame();
          this.pause();
          return;
        case 'loop':
          this._currentTime = this._currentTime % this._duration;
          break;
        case 'pingpong':
          this._direction = -1;
          this._currentTime = this._duration - (this._currentTime - this._duration);
          break;
      }
    } else if (this._currentTime <= 0) {
      switch (this._loopMode) {
        case 'none':
          this._currentTime = 0;
          this._emitFrame();
          this.pause();
          return;
        case 'loop':
          this._currentTime = this._duration + this._currentTime;
          break;
        case 'pingpong':
          this._direction = 1;
          this._currentTime = Math.abs(this._currentTime);
          break;
      }
    }

    this._emitFrame();
    this._scheduleFrame();
  }

  private _emitFrame(): void {
    for (const callback of this._frameCallbacks) {
      callback(this._currentTime);
    }
  }

  private _setState(state: PlaybackState): void {
    if (this._state === state) return;
    this._state = state;
    for (const callback of this._stateChangeCallbacks) {
      callback(state);
    }
  }
}
