import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listFeedback, type FeedbackListQuery } from './api';

const query: FeedbackListQuery = {
  search: '',
  category: 'all',
  status: 'all',
  sort: 'top',
  page: 1,
};

describe('feedback API client', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        items: [],
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 1,
        turnstileSiteKey: 'site-key',
      }),
    );
  });

  it('bypasses browser and edge caches for an explicit fresh list request', async () => {
    await listFeedback(query, { fresh: true });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/feedback\?.*_fresh=\d+$/u),
      expect.objectContaining({ cache: 'no-store' }),
    );
  });
});
