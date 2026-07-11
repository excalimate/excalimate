import { renderHook, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AnimationProject } from '../../core/models/Project';
import { useShareLoader } from './useShareLoader';

const mocks = vi.hoisted(() => ({
  loadShareUrl: vi.fn(),
  loadProjectDocumentIntoStores: vi.fn(),
  showNotification: vi.fn(),
}));

vi.mock('../../services/FileService', () => ({
  loadShareUrl: mocks.loadShareUrl,
}));

vi.mock('../../services/ProjectDocumentService', () => ({
  loadProjectDocumentIntoStores: mocks.loadProjectDocumentIntoStores,
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: mocks.showNotification },
}));

describe('useShareLoader', () => {
  afterEach(() => {
    mocks.loadShareUrl.mockReset();
    mocks.loadProjectDocumentIntoStores.mockReset();
    mocks.showNotification.mockReset();
    window.history.replaceState(null, '', '/');
  });

  it('clears the share hash after loading so recovery can own later refreshes', async () => {
    window.location.hash = '#share=synthetic,key';
    const project = {} as AnimationProject;
    mocks.loadShareUrl.mockResolvedValue(project);

    const { result } = renderHook(() => useShareLoader(), {
      wrapper: StrictMode,
    });
    expect(result.current).toBe('loading');

    await waitFor(() => expect(result.current).toBe('loaded'));
    expect(mocks.loadProjectDocumentIntoStores).toHaveBeenCalledWith(project);
    expect(mocks.loadShareUrl).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe('');
  });

  it('clears a failed share hash before allowing local editing', async () => {
    window.location.hash = '#share=missing,key';
    mocks.loadShareUrl.mockRejectedValue(new Error('Share not found'));

    const { result } = renderHook(() => useShareLoader());
    await waitFor(() => expect(result.current).toBe('failed'));

    expect(window.location.hash).toBe('');
    expect(mocks.showNotification).toHaveBeenCalled();
  });
});
