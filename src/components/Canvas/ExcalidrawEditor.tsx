import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { ExcalidrawSceneData } from '../../types/excalidraw';
import { useUIStore } from '../../stores/uiStore';
import { getCanvasViewport, setCanvasViewport } from './canvasViewport';
import '@excalidraw/excalidraw/index.css';

interface ExcalidrawEditorProps {
  onSceneChange?: (scene: ExcalidrawSceneData) => void;
  onElementsSelected?: (elementIds: string[]) => void;
  initialData?: ExcalidrawSceneData;
}

export function ExcalidrawEditor({
  onSceneChange,
  onElementsSelected,
  initialData,
}: ExcalidrawEditorProps) {
  const theme = useUIStore((s) => s.theme);
  const liveMode = useUIStore((s) => s.liveMode);
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const onSceneChangeRef = useRef(onSceneChange);
  const onElementsSelectedRef = useRef(onElementsSelected);
  // Track element IDs we've pushed to Excalidraw so we can detect external changes
  const knownElementIdsRef = useRef<string>('');
  // Suppress the next onChange from our own updateScene call
  const suppressNextChangeRef = useRef(false);

  useEffect(() => {
    onSceneChangeRef.current = onSceneChange;
  }, [onSceneChange]);
  useEffect(() => {
    onElementsSelectedRef.current = onElementsSelected;
  }, [onElementsSelected]);

  const handleApiReady = useCallback((api: ExcalidrawImperativeAPI) => {
    apiRef.current = api;
  }, []);

  const handleChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (elements: readonly ExcalidrawElement[], appState: any, _files: any) => {
      if (!apiRef.current) return;

      // Skip onChange triggered by our own updateScene (live mode sync)
      if (suppressNextChangeRef.current) {
        suppressNextChangeRef.current = false;
        return;
      }

      // Persist viewport for edit mode restoration
      if (appState?.scrollX != null) {
        setCanvasViewport('edit', {
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
          zoom: typeof appState.zoom === 'object' ? appState.zoom.value : (appState.zoom ?? 1),
        });
      }

      // Track whether a drawing tool is active (hides onboarding overlay)
      const toolType: string = appState?.activeTool?.type ?? 'selection';
      const isDrawTool = toolType !== 'selection' && toolType !== 'hand' && toolType !== 'eraser';
      if (isDrawTool !== useUIStore.getState().drawToolActive) {
        useUIStore.getState().setDrawToolActive(isDrawTool);
      }

      // Update known IDs from Excalidraw's own state (only needed for live mode sync)
      if (useUIStore.getState().liveMode) {
        const nonDeleted = elements.filter(el => !el.isDeleted);
        knownElementIdsRef.current = nonDeleted.map(el => el.id).join(',');
      }

      if (onSceneChangeRef.current) {
        const files = apiRef.current.getFiles();
        onSceneChangeRef.current({
          elements,
          appState: {
            viewBackgroundColor: appState?.viewBackgroundColor,
          },
          files: files ?? {},
        });
      }

      if (onElementsSelectedRef.current && appState?.selectedElementIds) {
        const selectedIds = Object.keys(appState.selectedElementIds).filter(
          (id: string) => appState.selectedElementIds[id],
        );
        onElementsSelectedRef.current(selectedIds);
      }
    },
    [],
  );

  const stableInitialData = useMemo(() => {
    if (!initialData) return undefined;
    const saved = getCanvasViewport('edit');
    return {
      elements: initialData.elements as ExcalidrawElement[],
      appState: {
        ...initialData.appState,
        ...(saved ? {
          scrollX: saved.scrollX,
          scrollY: saved.scrollY,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          zoom: { value: saved.zoom } as any,
        } : {}),
      },
      files: initialData.files,
    };
  }, [initialData]);

  // In live mode, sync external scene changes (from MCP) into Excalidraw.
  // Without this, MCP-created elements disappear because Excalidraw only reads
  // initialData on mount, and its onChange overwrites the store with stale data.
  useEffect(() => {
    if (!liveMode || !initialData) return;
    const api = apiRef.current;
    if (!api) return;

    const newIds = (initialData.elements as ExcalidrawElement[])
      .filter(el => !el.isDeleted)
      .map(el => el.id)
      .join(',');

    if (newIds !== knownElementIdsRef.current && newIds.length > 0) {
      knownElementIdsRef.current = newIds;
      suppressNextChangeRef.current = true;
      api.updateScene({
        elements: initialData.elements as ExcalidrawElement[],
      });
    }
  }, [liveMode, initialData]);

  return (
    <div
      className="excalidraw-wrapper"
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <Excalidraw
        excalidrawAPI={handleApiReady}
        initialData={stableInitialData}
        onChange={handleChange}
        theme={theme}
      />
    </div>
  );
}
