import { useEffect, useRef } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { useAnimationStore } from '../stores/animationStore';

const AUTOSAVE_KEY = 'excalidraw-animate-autosave';
const DEBOUNCE_MS = 2000;

export function useAutoSave() {
  const { project } = useProjectStore();
  const { timeline } = useAnimationStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!project) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      try {
        const data = JSON.stringify({ project, timeline });
        localStorage.setItem(AUTOSAVE_KEY, data);
      } catch (e) {
        console.warn('Auto-save failed:', e);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [project, timeline]);
}

export function loadAutoSave(): { project: unknown; timeline: unknown } | null {
  try {
    const data = localStorage.getItem(AUTOSAVE_KEY);
    return data ? (JSON.parse(data) as { project: unknown; timeline: unknown }) : null;
  } catch {
    return null;
  }
}

export function clearAutoSave(): void {
  localStorage.removeItem(AUTOSAVE_KEY);
}
