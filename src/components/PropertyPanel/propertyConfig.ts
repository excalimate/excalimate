import type { ReactNode } from 'react';
import { createElement } from 'react';
import {
  IconEye, IconArrowsHorizontal, IconArrowsVertical,
  IconArrowsMaximize, IconArrowsMinimize, IconRotate, IconPencil,
} from '@tabler/icons-react';
import type { AnimatableProperty } from '../../types/animation';
import { EASING_TYPES } from '../../types/animation';

export type PropertyConfig = {
  label: string;
  icon: ReactNode;
  suffix: string;
  min?: number;
  max?: number;
  step: number;
  displayScale?: number;
};

const ic = (Comp: typeof IconEye) => createElement(Comp, { size: 14 });

export const PROPERTY_CONFIG: Record<AnimatableProperty, PropertyConfig> = {
  opacity: { label: 'Opacity', icon: ic(IconEye), suffix: '%', min: 0, max: 100, step: 1, displayScale: 100 },
  translateX: { label: 'Position X', icon: ic(IconArrowsHorizontal), suffix: 'px', step: 1 },
  translateY: { label: 'Position Y', icon: ic(IconArrowsVertical), suffix: 'px', step: 1 },
  scaleX: { label: 'Scale X', icon: ic(IconArrowsMaximize), suffix: '%', min: 10, max: 500, step: 1, displayScale: 100 },
  scaleY: { label: 'Scale Y', icon: ic(IconArrowsMinimize), suffix: '%', min: 10, max: 500, step: 1, displayScale: 100 },
  rotation: { label: 'Rotation', icon: ic(IconRotate), suffix: '°', step: 1 },
  drawProgress: { label: 'Draw Progress', icon: ic(IconPencil), suffix: '%', min: 0, max: 100, step: 1, displayScale: 100 },
};

export const EASING_OPTIONS = EASING_TYPES.map((t) => ({ value: t, label: t }));
