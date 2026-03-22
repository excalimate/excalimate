import { generateScene, type FixtureScene } from './generator.js';

// Fixed seed for all presets — produces identical output every run
const SEED = 42;

export const SMALL: FixtureScene = generateScene(10, 10, SEED);
export const MEDIUM: FixtureScene = generateScene(35, 50, SEED + 1);
export const LARGE: FixtureScene = generateScene(85, 150, SEED + 2);
export const VERY_LARGE: FixtureScene = generateScene(280, 500, SEED + 3);

export const ALL_SCENES = {
  small: SMALL,
  medium: MEDIUM,
  large: LARGE,
  'very-large': VERY_LARGE,
} as const;

export type SceneSize = keyof typeof ALL_SCENES;
