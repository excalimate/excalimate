import { useEffect, useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { loadShareUrl } from '../../services/FileService';
import { loadProjectDocumentIntoStores } from '../../services/ProjectDocumentService';

export type ShareLoadState = 'idle' | 'loading' | 'loaded' | 'failed';

export function useShareLoader(): ShareLoadState {
  const [shareHash] = useState<string | null>(() =>
    window.location.hash.startsWith('#share=')
      ? window.location.hash
      : null,
  );
  const [state, setState] = useState<ShareLoadState>(
    shareHash ? 'loading' : 'idle',
  );
  const loadStarted = useRef(false);

  useEffect(() => {
    if (!shareHash || loadStarted.current) return;
    loadStarted.current = true;

    void loadShareUrl(shareHash)
      .then((project) => {
        loadProjectDocumentIntoStores(project);
        clearShareHash();
        setState('loaded');
      })
      .catch((error: unknown) => {
        clearShareHash();
        setState('failed');
        notifications.show({
          title: 'Unable to load shared animation',
          message:
            error instanceof Error ? error.message : 'The share is invalid.',
          color: 'red',
        });
      });
  }, [shareHash]);

  return state;
}

function clearShareHash(): void {
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${window.location.search}`,
  );
}
