import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import { WelcomeOverlay } from './WelcomeOverlay';

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  importFile: vi.fn(async () => undefined),
  openProject: vi.fn(async () => undefined),
}));

vi.mock('../../hooks/useMcpLive', () => ({
  useMcpLive: () => ({
    connected: false,
    connect: mocks.connect,
  }),
}));

vi.mock('../Toolbar/useFileOperations', () => ({
  useFileOperations: () => ({
    handleImportFile: mocks.importFile,
    handleLoadProjectFile: mocks.openProject,
  }),
}));

describe('WelcomeOverlay', () => {
  beforeEach(() => {
    mocks.connect.mockClear();
    mocks.importFile.mockClear();
    mocks.openProject.mockClear();
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

  function renderOverlay() {
    return render(
      <MantineProvider>
        <WelcomeOverlay />
      </MantineProvider>,
    );
  }

  it('exposes labeled, keyboard-operable Magic start actions', () => {
    renderOverlay();

    expect(
      screen.getByRole('heading', { name: 'Start with the canvas' }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Drop an Excalidraw or Excalimate file'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Start from a template' }),
    ).toBeDisabled();

    const startDrawing = screen.getByRole('button', {
      name: 'Start drawing',
    });
    startDrawing.focus();
    fireEvent.keyDown(startDrawing, { key: 'Enter' });
    fireEvent.click(startDrawing);

    expect(useUIStore.getState().startSurfaceDismissed).toBe(true);
  });

  it('routes import, open, and MCP actions through existing services', async () => {
    const { container } = renderOverlay();
    const importInput = container.querySelector<HTMLInputElement>(
      'input[accept^=".excalidraw"]',
    );
    const importFile = new File(['{}'], 'scene.excalidraw', {
      type: 'application/json',
    });
    const projectFile = new File(['{}'], 'project.excanim', {
      type: 'application/json',
    });

    fireEvent.change(importInput!, { target: { files: [importFile] } });
    await waitFor(() => expect(mocks.importFile).toHaveBeenCalledWith(importFile));

    act(() => useUIStore.getState().setStartSurfaceDismissed(false));
    let openInput: HTMLInputElement | null = null;
    await waitFor(() => {
      openInput = container.querySelector<HTMLInputElement>(
        'input[accept^=".excanim"]',
      );
      expect(openInput).not.toBeNull();
    });
    fireEvent.change(openInput!, {
      target: { files: [projectFile] },
    });
    await waitFor(() =>
      expect(mocks.openProject).toHaveBeenCalledWith(projectFile),
    );

    act(() => useUIStore.getState().setStartSurfaceDismissed(false));
    fireEvent.click(screen.getByRole('button', { name: 'Connect MCP' }));
    expect(mocks.connect).toHaveBeenCalledTimes(1);
  });
});
