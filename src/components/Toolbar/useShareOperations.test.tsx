import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useShareOperations } from './useShareOperations';

const shareId = 'AbCdEfGhIjKlMnOpQrStUv';
const deleteSecret = 'd'.repeat(43);
const encryptionKey = 'browser-only-encryption-key';
const expiresAt = '2030-01-02T03:04:05.000Z';

const mocks = vi.hoisted(() => ({
  ciphertext: new Uint8Array([0, 12, 250, 19]).buffer,
  deleteEncryptedShare: vi.fn(),
  encryptionKey: 'browser-only-encryption-key',
  payload: { envelopeVersion: 2 },
  playerPackage: { version: '1.0.0' },
  projectDocument: { schemaVersion: '2.0.0' },
  notification: vi.fn(),
  trackShare: vi.fn(),
  uploadEncryptedShare: vi.fn(),
  writeText: vi.fn(),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: mocks.notification },
}));

vi.mock('../../stores/projectStore', () => ({
  useProjectStore: {
    getState: () => ({
      cameraFrame: { aspectRatio: '16:9' },
      project: {
        name: 'Secret project name',
        scene: { appState: {}, elements: [], files: {} },
      },
      targets: [],
    }),
  },
}));

vi.mock('../../services/ProjectDocumentService', () => ({
 captureProjectDocument: () => mocks.projectDocument,
}));

vi.mock('../../services/playerPackage', () => ({
 generatePlayerPackage: vi.fn().mockResolvedValue(mocks.playerPackage),
}));

vi.mock('../../services/shareEnvelope', () => ({
 createShareEnvelope: () => mocks.payload,
}));

vi.mock('../../services/shareTransport', () => ({
 buildHostedPlayerUrl: (baseUrl: string, reference: { shareId: string; keyString: string }) =>
   `${baseUrl}/player.html#share=${reference.shareId},${reference.keyString}`,
}));

vi.mock('../../services/encryption', () => ({
  encryptData: vi.fn((payload: unknown) => {
    expect(payload).toBe(mocks.payload);
    return Promise.resolve(mocks.ciphertext);
  }),
  exportKeyToString: vi.fn().mockResolvedValue(mocks.encryptionKey),
  generateEncryptionKey: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../services/analytics/posthog', () => ({
  trackShare: mocks.trackShare,
}));

vi.mock('../../services/shareApi', () => ({
  deleteEncryptedShare: mocks.deleteEncryptedShare,
  formatShareExpiry: () => 'Jan 2, 2030, 3:04 AM',
  uploadEncryptedShare: mocks.uploadEncryptedShare,
}));

describe('useShareOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.uploadEncryptedShare.mockResolvedValue({
      deleteSecret,
      expiresAt,
      id: shareId,
    });
    mocks.deleteEncryptedShare.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: mocks.writeText },
    });
  });

  it('displays expiresAt without leaking capabilities to UX or analytics', async () => {
    const { result } = renderHook(() => useShareOperations());

    await act(async () => {
      await result.current.handleShare();
    });

    expect(mocks.uploadEncryptedShare).toHaveBeenCalledWith(mocks.ciphertext);
    expect(mocks.writeText).toHaveBeenCalledWith(
      `${window.location.origin}/player.html#share=${shareId},${encryptionKey}`,
    );
    expect(mocks.writeText.mock.calls[0][0]).not.toContain(deleteSecret);
    expect(mocks.trackShare).toHaveBeenCalledWith();

    const successNotification = mocks.notification.mock.calls[0][0] as {
      message: string;
    };
    expect(successNotification.message).toContain('Jan 2, 2030, 3:04 AM');
    expect(successNotification.message).not.toContain(deleteSecret);
    expect(successNotification.message).not.toContain(encryptionKey);
    expect(result.current.canRevoke).toBe(true);
  });

  it('uses the in-memory deletion capability for explicit revoke', async () => {
    const { result } = renderHook(() => useShareOperations());
    await act(async () => {
      await result.current.handleShare();
    });

    await act(async () => {
      await result.current.handleRevokeShare();
    });

    expect(mocks.deleteEncryptedShare).toHaveBeenCalledWith({
      deleteSecret,
      id: shareId,
    });
    expect(mocks.trackShare).toHaveBeenCalledTimes(1);
    expect(result.current.canRevoke).toBe(false);
  });
});
