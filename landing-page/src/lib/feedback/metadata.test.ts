import { describe, expect, it } from 'vitest';
import {
  createIssueBody,
  createPortalCommentBody,
  createVoteBody,
  parseIssueBody,
  parsePortalComment,
  parseVoteToken,
} from './metadata';

describe('feedback metadata', () => {
  it('round-trips issue content without exposing metadata', () => {
    const encoded = createIssueBody('A detailed animation request.', 'A *public* user');
    const parsed = parseIssueBody(encoded);

    expect(parsed.body).toBe('A detailed animation request.');
    expect(parsed.metadata).toEqual({ displayName: 'A *public* user' });
    expect(encoded).toContain('Submitted via');
    expect(encoded).not.toContain('A **public** user');
  });

  it('preserves developer text appended after portal metadata', () => {
    const encoded = `${createIssueBody('Original request.', 'Anonymous')}\n\nDeveloper note.`;
    const parsed = parseIssueBody(encoded);

    expect(parsed.metadata).toEqual({ displayName: 'Anonymous' });
    expect(parsed.body).toBe('Original request.\n\nDeveloper note.');
  });

  it('round-trips portal comments and preserves unicode', () => {
    const encoded = createPortalCommentBody(
      'This would help diagram reviews.',
      'Árvíztűrő',
      'a'.repeat(32),
    );
    const parsed = parsePortalComment(encoded);

    expect(parsed.body).toBe('This would help diagram reviews.');
    expect(parsed.metadata).toEqual({
      displayName: 'Árvíztűrő',
      authorToken: 'a'.repeat(32),
    });
  });

  it('identifies ballots and ignores malformed markers', () => {
    expect(parseVoteToken(createVoteBody('v'.repeat(32)))).toBe('v'.repeat(32));
    expect(parseVoteToken(`User content\n\n${createVoteBody('v'.repeat(32))}`)).toBeUndefined();
    expect(parseVoteToken('<!-- excalimate-feedback-vote:v1:not-base64! -->')).toBeUndefined();
    expect(parseIssueBody('Normal issue body').metadata).toBeUndefined();
  });
});
