import { useProjectStore } from '../../stores/projectStore';
import { useAnimationStore } from '../../stores/animationStore';
import type { ExcalidrawSceneData } from '../../types/excalidraw';
import type { AspectRatio } from '../../stores/projectStore';
import { createTimeline } from '../../core/models/Timeline';
import { fromProjectDocument } from '../../core/models/Project';
import {
  parseExcalidrawFileBlob,
  parseProjectFileBlob,
  parseMcpCheckpointBlob,
  importFromUrl,
  loadShareUrl,
  saveProjectFile,
} from '../../services/FileService';
import { extractTargets } from '../Canvas/extractTargets';
import {
  captureProjectDocument,
  loadProjectDocumentIntoStores,
} from '../../services/ProjectDocumentService';
import { trackNewProject, trackSaveProject, trackLoadProject, trackImport } from '../../services/analytics/posthog';

function resetTimeline() {
  const timeline = createTimeline();
  useAnimationStore.getState().setTimeline(timeline);
  useAnimationStore
    .getState()
    .setClipRange(0, Math.min(10_000, timeline.duration));
}

function importScene(name: string, scene: ExcalidrawSceneData) {
  useProjectStore.getState().createNewProject(name, scene);
  const targets = extractTargets(scene.elements);
  useProjectStore.getState().setTargets(targets);
  resetTimeline();
}

export function useFileOperations() {
  const handleNew = (name: string, aspectRatio: AspectRatio) => {
    useProjectStore.getState().createNewProject(name, {
      elements: [],
      appState: {},
      files: {},
    });
    useProjectStore.getState().setTargets([]);
    useProjectStore.getState().setCameraAspectRatio(aspectRatio);
    resetTimeline();
    trackNewProject(aspectRatio);
  };

  const handleSave= async () => {
    const project = useProjectStore.getState().project;
    if (!project) {
      window.alert('No project to save. Create or import a project first.');
      return;
    }
    try {
      const document = captureProjectDocument();
      if (!document) throw new Error('No project to save');
      await saveProjectFile(fromProjectDocument(document));
      useProjectStore.getState().markClean();
      trackSaveProject();
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      window.alert(`Failed to save: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleImportFile = async (file: File) => {
    const scene = await parseExcalidrawFileBlob(file);
    importScene('Imported Animation', scene);
    trackImport('file');
  };

  const handleImportUrl = async (url: string) => {
    const scene = await importFromUrl(url);
    importScene('Imported from URL', scene);
    trackImport('url');
  };

  /** Load a .excanim project file (from drag & drop) */
  const handleLoadProjectFile = async (file: File) => {
    const project = await parseProjectFileBlob(file);
    loadProjectDocumentIntoStores(project);
    trackLoadProject('file');
  };

  /** Load an MCP checkpoint file (from drag & drop) */
  const handleLoadCheckpointFile = async (file: File) => {
    loadProjectDocumentIntoStores(await parseMcpCheckpointBlob(file));
    trackLoadProject('checkpoint');
  };

  /** Load from an E2E encrypted share URL */
  const handleLoadShareUrl = async (url: string) => {
    loadProjectDocumentIntoStores(await loadShareUrl(url));
    trackLoadProject('share_url');
  };

  return {
    handleNew, handleSave,
    handleImportFile, handleImportUrl,
    handleLoadProjectFile, handleLoadCheckpointFile, handleLoadShareUrl,
  };
}
