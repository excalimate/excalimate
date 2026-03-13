import { nanoid } from 'nanoid';

/** Generate a unique ID for keyframes, tracks, etc */
export function generateId(): string {
  return nanoid();
}

/** Generate a short ID for display purposes */
export function generateShortId(): string {
  return nanoid(8);
}
