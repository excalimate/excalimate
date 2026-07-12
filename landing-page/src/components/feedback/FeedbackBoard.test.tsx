import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { markFeedbackListStale } from '../../lib/feedback/api';
import FeedbackBoard from './FeedbackBoard';

const { listFeedbackMock } = vi.hoisted(() => ({
  listFeedbackMock: vi.fn(),
}));

vi.mock('../../lib/feedback/api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/feedback/api')>(
    '../../lib/feedback/api',
  );
  return {
    ...actual,
    listFeedback: listFeedbackMock,
  };
});

vi.mock('./SubmitFeedbackModal', () => ({
  SubmitFeedbackModal: () => null,
}));

vi.mock('./Turnstile', () => ({
  TurnstileAction: () => null,
}));

const response = {
  items: [],
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 1,
  turnstileSiteKey: 'site-key',
};

describe('FeedbackBoard', () => {
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('requests fresh feedback when restored from browser history', async () => {
    listFeedbackMock.mockResolvedValue(response);
    render(<FeedbackBoard />);

    await waitFor(() => expect(listFeedbackMock).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('tab', { name: 'All statuses' })).toHaveClass('feedback-status-tab');
    markFeedbackListStale();
    const pageShow = new Event('pageshow');
    Object.defineProperty(pageShow, 'persisted', { value: true });
    window.dispatchEvent(pageShow);

    await waitFor(() => expect(listFeedbackMock).toHaveBeenCalledTimes(2));
    expect(listFeedbackMock).toHaveBeenLastCalledWith(
      expect.any(Object),
      expect.objectContaining({ fresh: true }),
    );
  });
});
