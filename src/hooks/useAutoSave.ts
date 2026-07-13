import { useEffect, useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';
import type { ProjectDocument } from '@excalimate/project-schema';
import { useProjectStore } from '../stores/projectStore';
import { useAnimationStore } from '../stores/animationStore';
import {
  captureProjectDocument,
  loadProjectDocumentIntoStores,
} from '../services/ProjectDocumentService';
import {
  IndexedDbRecoveryStore,
} from '../services/recovery/IndexedDbRecoveryStore';

const DEBOUNCE_MS = 2_000;
const recoveryStore = new IndexedDbRecoveryStore();

export function useAutoSave(
  options: { restoreLocal?: boolean; enabled?: boolean } = {},
): boolean {
  const restoreLocal = options.restoreLocal ?? true;
  const enabled = options.enabled ?? true;
  const project = useProjectStore((state) => state.project);
  const cameraFrame = useProjectStore((state) => state.cameraFrame);
  const timeline = useAnimationStore((state) => state.timeline);
  const clipStart = useAnimationStore((state) => state.clipStart);
  const clipEnd = useAnimationStore((state) => state.clipEnd);
  const [recoveryReady, setRecoveryReady] = useState(!restoreLocal);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveErrorShownRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      if (!restoreLocal) return;
      try {
        const snapshot = await recoveryStore.latest();
        if (!snapshot || cancelled) return;
        loadProjectDocumentIntoStores(snapshot.document);
        notifications.show({
          title: 'Project recovered',
          message: 'Restored the latest local recovery snapshot.',
          color: 'blue',
        });
      } catch (error) {
        if (!cancelled) showRecoveryError('Recovery unavailable', error);
      } finally {
        if (!cancelled) setRecoveryReady(true);
      }
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, [restoreLocal]);

  useEffect(() => {
    if (!enabled || !recoveryReady || !project) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      void (async () => {
        try {
          const document = captureProjectDocument();
          if (!document) return;
          await recoveryStore.save(document);
          saveErrorShownRef.current = false;
        } catch (error) {
          if (saveErrorShownRef.current) return;
          saveErrorShownRef.current = true;
          showRecoveryError('Local recovery failed', error);
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    cameraFrame,
    clipEnd,
    clipStart,
    enabled,
    project,
    recoveryReady,
    timeline,
  ]);

  return recoveryReady;
}

export async function loadAutoSave(): Promise<ProjectDocument | null> {
  return (await recoveryStore.latest())?.document ?? null;
}

export async function clearAutoSave(): Promise<void> {
  await recoveryStore.clear();
}

function showRecoveryError(title: string, error: unknown): void {
  notifications.show({
    title,
    message:
      error instanceof Error
        ? error.message
        : 'The browser could not access local recovery storage.',
    color: 'red',
  });
}
