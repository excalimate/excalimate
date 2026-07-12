import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isFeedbackListStale } from '../../lib/feedback/api';
import { SubmitFeedbackModal } from './SubmitFeedbackModal';

const { createFeedbackMock } = vi.hoisted(() => ({
  createFeedbackMock: vi.fn(),
}));

vi.mock('../../lib/feedback/api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/feedback/api')>(
    '../../lib/feedback/api',
  );
  return {
    ...actual,
    createFeedback: createFeedbackMock,
  };
});

vi.mock('./Turnstile', () => ({
  TurnstileWidget: ({ onToken }: { onToken: (token: string) => void }) => (
    <button type="button" onClick={() => onToken('turnstile-token')}>
      Complete verification
    </button>
  ),
}));

describe('SubmitFeedbackModal', () => {
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('shows confirmation before navigating and marks the feedback list stale', async () => {
    createFeedbackMock.mockResolvedValue({ number: 123, url: '/feedback/123' });
    const onSubmitted = vi.fn();

    render(
      <MantineProvider>
        <SubmitFeedbackModal
          opened
          onClose={vi.fn()}
          onSubmitted={onSubmitted}
          siteKey="site-key"
        />
      </MantineProvider>,
    );

    fireEvent.change(screen.getByRole('textbox', { name: /^Title/u }), {
      target: { value: 'Add a presentation timer' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /^Description/u }), {
      target: { value: 'Show elapsed and remaining time while presenting a scene.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Complete verification' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit feedback' }));

    expect(
      await screen.findByRole('heading', { name: 'Feedback submitted' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Opening your feedback...')).toBeInTheDocument();
    expect(isFeedbackListStale()).toBe(true);
    expect(onSubmitted).not.toHaveBeenCalled();

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith('/feedback/123'), {
      timeout: 2_000,
    });
  });
});
