import { useCallback } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { extractTargets } from '../components/Canvas/ExcalidrawEditor';
import type { ExcalidrawSceneData } from '../types/excalidraw';

export function useExcalidraw() {
  const { project, updateScene, setTargets, createNewProject } =
    useProjectStore();

  const handleSceneChange = useCallback(
    (scene: ExcalidrawSceneData) => {
      if (project) {
        updateScene(scene);
      } else {
        createNewProject('Untitled Animation', scene);
      }
      const targets = extractTargets(scene.elements);
      setTargets(targets);
    },
    [project, updateScene, setTargets, createNewProject],
  );

  const handleElementsSelected = useCallback(
    (_elementIds: string[]) => {
      // This could be connected to uiStore.setSelectedElements
    },
    [],
  );

  return {
    scene: project?.scene ?? null,
    handleSceneChange,
    handleElementsSelected,
  };
}
