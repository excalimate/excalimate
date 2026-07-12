import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FeedbackSummary } from '../../lib/feedback/types';
import { FeedbackCard } from './FeedbackCard';
import { FeedbackProvider } from './FeedbackProvider';

const item: FeedbackSummary = {
  number: 42,
  title: 'Add timeline snapping',
  excerpt: 'Make keyframes easier to align.',
  category: 'improvement',
  status: 'completed',
  voteCount: 12,
  commentCount: 3,
  createdAt: '2026-07-11T00:00:00Z',
  updatedAt: '2026-07-11T00:00:00Z',
  authorName: 'Anonymous',
  htmlUrl: 'https://github.com/excalimate/excalimate/issues/42',
};

describe('FeedbackCard', () => {
  it('renders status and disables voting for terminal feedback', () => {
    render(
      <FeedbackProvider>
        <FeedbackCard item={item} voting={false} onVote={vi.fn()} />
      </FeedbackProvider>,
    );

    expect(screen.getByRole('heading', { name: item.title })).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /12 votes/u })).toBeDisabled();
  });
});
