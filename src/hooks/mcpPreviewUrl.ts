const PAIRING_URL_MESSAGE =
  'Paste the MCP preview pairing URL printed after your MCP client connects into File > Preferences.';

export function normalizeMcpPreviewUrl(input: string): string {
  const value = input.trim();
  if (!value) throw new Error(PAIRING_URL_MESSAGE);

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(PAIRING_URL_MESSAGE);
  }

  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(PAIRING_URL_MESSAGE);
  }

  const segments = url.pathname.split('/').filter(Boolean);
  if (
    segments[0] !== 'p' ||
    (segments.length !== 2 && segments.length !== 3) ||
    !segments[1]
  ) {
    throw new Error(PAIRING_URL_MESSAGE);
  }

  url.pathname = `/${segments.join('/')}`;
  return url.toString();
}
