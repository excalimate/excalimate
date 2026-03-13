/**
 * Parse an Excalidraw sharing URL and extract the scene ID and private key.
 *
 * Supports formats:
 *   - https://excalidraw.com/#json=ID,KEY
 *   - #json=ID,KEY
 *
 * @returns { id, key } or null if the URL doesn't match
 */
export function parseExcalidrawUrl(url: string): { id: string; key: string } | null {
  try {
    let hash: string;
    if (url.startsWith('#')) {
      hash = url.slice(1);
    } else {
      const parsed = new URL(url);
      hash = parsed.hash.slice(1);
    }

    const params = new URLSearchParams(hash);
    const jsonParam = params.get('json');
    if (!jsonParam) return null;

    const match = /^([a-zA-Z0-9_-]+),([a-zA-Z0-9_-]+)$/.exec(jsonParam);
    if (!match) return null;

    return { id: match[1], key: match[2] };
  } catch {
    return null;
  }
}
