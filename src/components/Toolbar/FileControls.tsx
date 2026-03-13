import { useState } from 'react';
import { Button } from '../common';
import { Modal } from '../common';
import { useProjectStore } from '../../stores/projectStore';
import { useAnimationStore } from '../../stores/animationStore';
import {
  importExcalidrawFile,
  saveProjectFile,
  loadProjectFile,
  importFromUrl,
  loadMcpCheckpoint,
} from '../../services/FileService';
import {
  generateEncryptionKey,
  encryptData,
  exportKeyToString,
  importKeyFromString,
  decryptData,
  extractKeyFromHash,
} from '../../services/encryption';
import { extractTargets } from '../Canvas/ExcalidrawEditor';

function resetTimeline() {
  useAnimationStore.getState().setTimeline({
    id: crypto.randomUUID?.() ?? Date.now().toString(),
    name: 'Animation 1',
    duration: 30000,
    fps: 60,
    tracks: [],
  });
}

export function FileControls() {
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

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
      // Restore camera BEFORE setTargets (which auto-fits if camera is at default)
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

  const handleImportUrl = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const scene = await importFromUrl(url.trim());
      useProjectStore.getState().createNewProject('Imported from URL', scene);
      const targets = extractTargets(scene.elements);
      useProjectStore.getState().setTargets(targets);
      resetTimeline();
      setShowUrlModal(false);
      setUrl('');
    } catch (e) {
      window.alert(
        `Failed to import from URL: ${e instanceof Error ? e.message : 'Unknown error'}`,
      );
    } finally {
      setLoading(false);
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

  const handleShare = async () => {
    const project = useProjectStore.getState().project;
    if (!project?.scene) {
      window.alert('No project to share.');
      return;
    }
    try {
      setLoading(true);
      const timeline = useAnimationStore.getState().timeline;
      const { clipStart, clipEnd } = useAnimationStore.getState();
      const cameraFrame = useProjectStore.getState().cameraFrame;

      const payload = {
        scene: project.scene,
        timeline,
        clipStart,
        clipEnd,
        cameraFrame,
      };

      // Encrypt
      const key = await generateEncryptionKey();
      const encrypted = await encryptData(payload, key);
      const keyStr = await exportKeyToString(key);

      // Upload encrypted blob to server
      const serverUrl = 'http://localhost:3001';
      const response = await fetch(`${serverUrl}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: encrypted,
      });
      const { id } = await response.json();

      // Build shareable URL with key in hash (never sent to server)
      const shareUrl = `${window.location.origin}${window.location.pathname}#share=${id},${keyStr}`;
      await navigator.clipboard.writeText(shareUrl);
      window.alert(`Share link copied to clipboard!\n\nThe encryption key is in the URL — the server cannot read your data.`);
    } catch (e) {
      window.alert(`Failed to share: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="sm" onClick={handleNew}>
          New
        </Button>
        <Button variant="ghost" size="sm" onClick={handleOpen}>
          Open
        </Button>
        <Button variant="ghost" size="sm" onClick={handleSave}>
          Save
        </Button>
        <div className="w-px h-4 bg-[var(--color-border)] mx-0.5" />
        <Button variant="ghost" size="sm" onClick={handleImportFile}>
          Import
        </Button>
        <Button variant="ghost" size="sm" onClick={handleLoadCheckpoint}>
          MCP
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowUrlModal(true)}>
          URL
        </Button>
        <div className="w-px h-4 bg-[var(--color-border)] mx-0.5" />
        <Button variant="ghost" size="sm" onClick={handleShare}>
          🔒 Share
        </Button>
      </div>

      {showUrlModal && (
        <Modal
          isOpen={showUrlModal}
          onClose={() => {
            setShowUrlModal(false);
            setUrl('');
          }}
          title="Import from Excalidraw URL"
          footer={
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowUrlModal(false);
                  setUrl('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleImportUrl}
                disabled={loading || !url.trim()}
              >
                {loading ? 'Loading...' : 'Import'}
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Paste an Excalidraw sharing link to import the drawing.
            </p>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleImportUrl();
              }}
              placeholder="https://excalidraw.com/#json=..."
              className="w-full px-3 py-2 text-sm rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              autoFocus
              disabled={loading}
            />
            <p className="text-xs text-[var(--color-text-secondary)]">
              Supported format:{' '}
              <code className="text-indigo-400">https://excalidraw.com/#json=ID,KEY</code>
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
