const ISSUE_MARKER = 'excalimate-feedback';
const COMMENT_MARKER = 'excalimate-feedback-comment';
const VOTE_MARKER = 'excalimate-feedback-vote';
const VERSION = 'v1';

export interface IssueMetadata {
  displayName: string;
}

export interface CommentMetadata {
  displayName: string;
  authorToken: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function encodePayload(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

function decodePayload<T>(value: string): T | undefined {
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    return undefined;
  }
}

function createMarker(name: string, payload: unknown): string {
  return `<!-- ${name}:${VERSION}:${encodePayload(payload)} -->`;
}

function readMarker<T>(body: string | null, name: string, wholeBody = false): T | undefined {
  if (!body) return undefined;
  const source = `<!--\\s*${name}:${VERSION}:([A-Za-z0-9_-]+)\\s*-->`;
  const match = wholeBody
    ? body.match(new RegExp(`^\\s*${source}\\s*$`, 'u'))
    : Array.from(body.matchAll(new RegExp(source, 'gu'))).at(-1);
  return match?.[1] ? decodePayload<T>(match[1]) : undefined;
}

function stripMarker(body: string, name: string): string {
  return body
    .replace(new RegExp(`\\n?<!--\\s*${name}:${VERSION}:[A-Za-z0-9_-]+\\s*-->`, 'gu'), '')
    .trim();
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_[\]<>])/gu, '\\$1');
}

export function createIssueBody(description: string, displayName: string): string {
  const attribution = `Submitted via [Excalimate Feedback](https://excalimate.com/feedback) by **${escapeMarkdown(displayName)}**.`;
  return `${description.trim()}\n\n---\n${attribution}\n\n${createMarker(ISSUE_MARKER, { displayName } satisfies IssueMetadata)}`;
}

export function parseIssueBody(body: string | null): {
  body: string;
  metadata?: IssueMetadata;
} {
  const candidate = readMarker<unknown>(body, ISSUE_MARKER);
  const metadata =
    isRecord(candidate) &&
    typeof candidate.displayName === 'string' &&
    candidate.displayName.length <= 60
      ? { displayName: candidate.displayName }
      : undefined;
  let visibleBody = stripMarker(body ?? '', ISSUE_MARKER);
  if (metadata) {
    const attribution = `\n\n---\nSubmitted via [Excalimate Feedback](https://excalimate.com/feedback) by **${escapeMarkdown(metadata.displayName)}**.`;
    const attributionIndex = visibleBody.indexOf(attribution);
    if (attributionIndex !== -1) {
      const before = visibleBody.slice(0, attributionIndex).trimEnd();
      const after = visibleBody.slice(attributionIndex + attribution.length).trimStart();
      visibleBody = [before, after].filter(Boolean).join('\n\n');
    }
  }
  return {
    body: visibleBody,
    metadata,
  };
}

export function createPortalCommentBody(
  body: string,
  displayName: string,
  authorToken: string,
): string {
  const marker = createMarker(COMMENT_MARKER, {
    displayName,
    authorToken,
  } satisfies CommentMetadata);
  return `**${escapeMarkdown(displayName)}**\n\n${body.trim()}\n\n${marker}`;
}

export function parsePortalComment(body: string): {
  body: string;
  metadata?: CommentMetadata;
} {
  const candidate = readMarker<unknown>(body, COMMENT_MARKER);
  const metadata =
    isRecord(candidate) &&
    typeof candidate.displayName === 'string' &&
    candidate.displayName.length <= 60 &&
    typeof candidate.authorToken === 'string' &&
    /^[A-Za-z0-9_-]{20,128}$/u.test(candidate.authorToken)
      ? {
          displayName: candidate.displayName,
          authorToken: candidate.authorToken,
        }
      : undefined;
  if (!metadata) return { body };

  const withoutMarker = stripMarker(body, COMMENT_MARKER);
  const attribution = `**${escapeMarkdown(metadata.displayName)}**`;
  return {
    body: withoutMarker.startsWith(attribution)
      ? withoutMarker.slice(attribution.length).trim()
      : withoutMarker,
    metadata,
  };
}

export function createVoteBody(voterToken: string): string {
  return createMarker(VOTE_MARKER, { voterToken });
}

export function parseVoteToken(body: string): string | undefined {
  const candidate = readMarker<unknown>(body, VOTE_MARKER, true);
  return isRecord(candidate) &&
    typeof candidate.voterToken === 'string' &&
    /^[A-Za-z0-9_-]{20,128}$/u.test(candidate.voterToken)
    ? candidate.voterToken
    : undefined;
}
