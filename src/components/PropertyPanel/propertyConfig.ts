import type { AnimatableProperty } from '../../types/animation';
import { EASING_TYPES } from '../../types/animation';

export type PropertyConfig = {
  label: string;
  icon: string;
  suffix: string;
  min?: number;
  max?: number;
  step: number;
  displayScale?: number;
};

export const PROPERTY_CONFIG: Record<AnimatableProperty, PropertyConfig> = {
  opacity: { label: 'Opacity', icon: '👁', suffix: '%', min: 0, max: 100, step: 1, displayScale: 100 },
  translateX: { label: 'Position X', icon: '↔', suffix: 'px', step: 1 },
  translateY: { label: 'Position Y', icon: '↕', suffix: 'px', step: 1 },
  scaleX: { label: 'Scale X', icon: '⇔', suffix: '%', min: 10, max: 500, step: 1, displayScale: 100 },
  scaleY: { label: 'Scale Y', icon: '⇕', suffix: '%', min: 10, max: 500, step: 1, displayScale: 100 },
  rotation: { label: 'Rotation', icon: '↻', suffix: '°', step: 1 },
  drawProgress: { label: 'Draw Progress', icon: '✏', suffix: '%', min: 0, max: 100, step: 1, displayScale: 100 },
};

export const EASING_OPTIONS = EASING_TYPES.map((t) => ({ value: t, label: t }));
