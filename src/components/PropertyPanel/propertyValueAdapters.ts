import type { AnimatableProperty } from '../../types/animation';
import { PROPERTY_CONFIG } from './propertyConfig';

/** Convert internal value to display value */
export function toDisplay(property: AnimatableProperty, internal: number): number {
  const config = PROPERTY_CONFIG[property];
  if (!config) return internal;
  return internal * (config.displayScale ?? 1);
}

/** Convert display value to internal value */
export function toInternal(property: AnimatableProperty, display: number): number {
  const config = PROPERTY_CONFIG[property];
  if (!config) return display;
  return display / (config.displayScale ?? 1);
}
