import { useCallback, useRef } from 'react';
import { extractTargets } from '../Canvas/extractTargets';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import type { ExcalidrawSceneData } from '../../types/excalidraw';

export function useSceneChangeSync(): {
  handleSceneChange: (scene: ExcalidrawSceneData) => void;
  handleElementsSelected: (elementIds: string[]) => void;
} {
  const sceneChangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSceneChange = useCallback((scene: ExcalidrawSceneData) => {
    const pStore = useProjectStore.getState();
    if (pStore.project) {
      pStore.updateScene(scene);
    } else {
      pStore.createNewProject('Untitled Animation', scene);
    }
    if (sceneChangeTimer.current) clearTimeout(sceneChangeTimer.current);
    sceneChangeTimer.current = setTimeout(() => {
      const newTargets = extractTargets(scene.elements);
      useProjectStore.getState().setTargets(newTargets);
    }, 100);
  }, []);

  const handleElementsSelected = useCallback((elementIds: string[]) => {
    useUIStore.getState().setSelectedElements(elementIds);
  }, []);

  return { handleSceneChange, handleElementsSelected };
}
