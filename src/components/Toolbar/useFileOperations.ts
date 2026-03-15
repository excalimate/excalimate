import { useProjectStore } from '../../stores/projectStore';
import { useAnimationStore } from '../../stores/animationStore';
import type { ExcalidrawSceneData } from '../../types/excalidraw';
import {
  parseExcalidrawFileBlob,
  parseProjectFileBlob,
  parseMcpCheckpointBlob,
  importFromUrl,
  loadShareUrl,
  saveProjectFile,
} from '../../services/FileService';
import { extractTargets } from '../Canvas/extractTargets';
import { computeFrameAtTime } from '../../core/engine/playbackSingleton';
import { useUIStore } from '../../stores/uiStore';

function resetTimeline() {
  useAnimationStore.getState().setTimeline({
    id: crypto.randomUUID?.() ?? Date.now().toString(),
    name: 'Animation 1',
    duration: 30000,
    fps: 60,
    tracks: [],
  });
}

function importScene(name: string, scene: ExcalidrawSceneData) {
  useProjectStore.getState().createNewProject(name, scene);
  const targets = extractTargets(scene.elements);
  useProjectStore.getState().setTargets(targets);
  resetTimeline();
}

export function useFileOperations() {
  const handleNew = () => {
    if (!window.confirm('Create a new project? Unsaved changes will be lost.')) return;
    useProjectStore.getState().createNewProject('Untitled Animation', {
      elements: [],
      appState: {},
      files: {},
    });
    useProjectStore.getState().setTargets([]);
    resetTimeline();
  };

  const handleSave= async () => {
    const project = useProjectStore.getState().project;
    if (!project) {
      window.alert('No project to save. Create or import a project first.');
      return;
    }
    try {
      const timeline = useAnimationStore.getState().timeline;
      const { clipStart, clipEnd } = useAnimationStore.getState();
      const cameraFrame = useProjectStore.getState().cameraFrame;
      await saveProjectFile({
        ...project,
        timeline,
        clipStart,
        clipEnd,
        cameraFrame,
        updatedAt: new Date().toISOString(),
      });
      useProjectStore.getState().markClean();
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      window.alert(`Failed to save: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleImportFile = async (file: File) => {
    const scene = await parseExcalidrawFileBlob(file);
    importScene('Imported Animation', scene);
  };

  const handleImportUrl = async (url: string) => {
    const scene = await importFromUrl(url);
    importScene('Imported from URL', scene);
  };

  /** Load a .excanim project file (from drag & drop) */
  const handleLoadProjectFile = async (file: File) => {
    const project = await parseProjectFileBlob(file);
    useProjectStore.getState().loadProject(project);
    if (project.cameraFrame) {
      useProjectStore.getState().setCameraFrame(project.cameraFrame);
    }
    const targets = extractTargets(project.scene.elements);
    useProjectStore.getState().setTargets(targets);
    useAnimationStore.getState().setTimeline(project.timeline);
    if (project.clipStart !== undefined && project.clipEnd !== undefined) {
      useAnimationStore.getState().setClipRange(project.clipStart, project.clipEnd);
    }
    useUIStore.getState().setMode('animate');
    computeFrameAtTime(0);
  };

  /** Load an MCP checkpoint file (from drag & drop) */
  const handleLoadCheckpointFile = async (file: File) => {
    const checkpoint = await parseMcpCheckpointBlob(file);
    useProjectStore.getState().createNewProject('MCP Checkpoint', checkpoint.scene);
    const targets = extractTargets(checkpoint.scene.elements);
    useProjectStore.getState().setTargets(targets);
    if (checkpoint.timeline) {
      useAnimationStore.getState().setTimeline(checkpoint.timeline);
    } else {
      resetTimeline();
    }
    if (checkpoint.cameraFrame) {
      useProjectStore.getState().setCameraFrame(checkpoint.cameraFrame);
    }
    useAnimationStore.getState().setClipRange(checkpoint.clipStart, checkpoint.clipEnd);
    useUIStore.getState().setMode('animate');
    computeFrameAtTime(0);
  };

  /** Load from an E2E encrypted share URL */
  const handleLoadShareUrl = async (url: string) => {
    const data = await loadShareUrl(url);
    useProjectStore.getState().createNewProject('Shared Animation', data.scene);
    const targets = extractTargets(data.scene.elements);
    useProjectStore.getState().setTargets(targets);
    if (data.timeline) useAnimationStore.getState().setTimeline(data.timeline);
    if (data.cameraFrame) useProjectStore.getState().setCameraFrame(data.cameraFrame);
    if (data.clipStart !== undefined && data.clipEnd !== undefined) {
      useAnimationStore.getState().setClipRange(data.clipStart, data.clipEnd);
    }
    useUIStore.getState().setMode('animate');
    computeFrameAtTime(0);
  };

  return {
    handleNew, handleSave,
    handleImportFile, handleImportUrl,
    handleLoadProjectFile, handleLoadCheckpointFile, handleLoadShareUrl,
  };
}
