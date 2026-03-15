import { useProjectStore } from '../../stores/projectStore';
import { useAnimationStore } from '../../stores/animationStore';
import {
  importExcalidrawFile,
  loadMcpCheckpoint,
  loadProjectFile,
  saveProjectFile,
} from '../../services/FileService';
import { extractTargets } from '../Canvas/extractTargets';

function resetTimeline() {
  useAnimationStore.getState().setTimeline({
    id: crypto.randomUUID?.() ?? Date.now().toString(),
    name: 'Animation 1',
    duration: 30000,
    fps: 60,
    tracks: [],
  });
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

  const handleOpen = async () => {
    try {
      const project = await loadProjectFile();
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
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      window.alert(`Failed to open project: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleSave = async () => {
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

  const handleImportFile = async () => {
    try {
      const scene = await importExcalidrawFile();
      useProjectStore.getState().createNewProject('Imported Animation', scene);
      const targets = extractTargets(scene.elements);
      useProjectStore.getState().setTargets(targets);
      resetTimeline();
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      window.alert(`Failed to import: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleLoadCheckpoint = async () => {
    try {
      const checkpoint = await loadMcpCheckpoint();
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
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      window.alert(`Failed to load checkpoint: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  return { handleNew, handleOpen, handleSave, handleImportFile, handleLoadCheckpoint };
}
