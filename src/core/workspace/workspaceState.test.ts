import { beforeEach, describe, expect, it } from 'vitest';
import {
  migrateV1Project,
  parseProjectDocument,
} from '@excalimate/project-schema';
import { createProject } from '../models/Project';
import { getPlaybackController } from '../engine/playbackSingleton';
import { useAnimationStore } from '../../stores/animationStore';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import {
  captureProjectDocument,
  loadProjectDocumentIntoStores,
} from '../../services/ProjectDocumentService';
import {
  SYNTHETIC_V1_PROJECT,
  createSyntheticV2Project,
} from '../../test-fixtures/projectDocuments';
import { resolveWorkspaceShellFlags } from './workspaceFlags';
import {
  getMagicControlsPlacement,
  getMagicPreviewPolicy,
  getWorkspaceMinimumWidth,
} from './workspaceLayout';

describe('progressive workspace state', () => {
  beforeEach(() => {
    getPlaybackController();
    useProjectStore.setState({
      project: null,
      targets: [],
      isDirty: false,
    });
    useUIStore.setState({
      workspace: 'magic',
      canvasMode: 'design',
      mode: 'edit',
      startSurfaceDismissed: false,
    });
  });

  it('defaults new and import-only projects to Magic design', () => {
    const project = createProject('Untitled', {
      elements: [],
      appState: {},
      files: {},
    });

    expect(project.preferredWorkspace).toBe('magic');
    expect(useUIStore.getState()).toMatchObject({
      workspace: 'magic',
      canvasMode: 'design',
      mode: 'edit',
    });
  });

  it('migrates legacy animation tracks to Studio and empty legacy files to Magic', () => {
    const animated = migrateV1Project(structuredClone(SYNTHETIC_V1_PROJECT));
    const empty = migrateV1Project({
      ...structuredClone(SYNTHETIC_V1_PROJECT),
      timeline: {
        ...SYNTHETIC_V1_PROJECT.timeline,
        tracks: [],
      },
    });

    expect(animated.preferredWorkspace).toBe('studio');
    expect(empty.preferredWorkspace).toBe('magic');
  });

  it('honors and persists the Studio preference without converting timeline data', () => {
    const document = createSyntheticV2Project();
    document.preferredWorkspace = 'studio';
    const originalTimeline = structuredClone(document.timeline);

    loadProjectDocumentIntoStores(document);
    expect(useUIStore.getState().workspace).toBe('studio');

    useUIStore.getState().setWorkspace('magic');
    useUIStore.getState().setWorkspace('studio');

    expect(useAnimationStore.getState().timeline).toEqual(originalTimeline);
    expect(captureProjectDocument()?.preferredWorkspace).toBe('studio');
  });

  it('preserves the existing edit/animate compatibility mode when requested', () => {
    const document = createSyntheticV2Project();
    document.preferredWorkspace = 'studio';
    useUIStore.setState({ mode: 'edit' });

    loadProjectDocumentIntoStores(document, {
      activateAnimationMode: false,
    });

    expect(useUIStore.getState()).toMatchObject({
      workspace: 'studio',
      mode: 'edit',
    });
  });

  it('accepts Studio as a typed V2 preferred workspace', () => {
    const document = createSyntheticV2Project();
    document.preferredWorkspace = 'studio';

    expect(parseProjectDocument(document).preferredWorkspace).toBe('studio');
  });

  it('provides build and query rollback routes to the legacy Studio shell', () => {
    expect(resolveWorkspaceShellFlags('?legacyStudio=1')).toEqual({
      forceStudioShell: true,
      forceLegacySequence: false,
    });
    expect(resolveWorkspaceShellFlags('?studio=legacy')).toEqual({
      forceStudioShell: true,
      forceLegacySequence: false,
    });
    expect(resolveWorkspaceShellFlags('', true)).toEqual({
      forceStudioShell: true,
      forceLegacySequence: false,
    });
    expect(resolveWorkspaceShellFlags('?workspace=sequence')).toEqual({
      forceStudioShell: false,
      forceLegacySequence: false,
      workspaceOverride: 'sequence',
    });
    expect(resolveWorkspaceShellFlags('?legacySequence=1')).toEqual({
      forceStudioShell: false,
      forceLegacySequence: true,
    });
    expect(resolveWorkspaceShellFlags('', false, true)).toEqual({
      forceStudioShell: false,
      forceLegacySequence: true,
    });
  });

  it('uses responsive control surfaces and never auto-starts reduced-motion previews', () => {
    expect(getMagicControlsPlacement(true, true)).toBe('drawer');
    expect(getMagicControlsPlacement(false, true)).toBe('sidebar');
    expect(getMagicControlsPlacement(true, false)).toBe('hidden');
    expect(getWorkspaceMinimumWidth('sequence')).toBe(768);
    expect(getWorkspaceMinimumWidth('studio')).toBe(960);
    expect(getMagicPreviewPolicy(true)).toEqual({
      autoPlay: false,
      transition: 'none',
    });
    expect(getMagicPreviewPolicy(false)).toEqual({
      autoPlay: false,
      transition: 'standard',
    });
  });
});
