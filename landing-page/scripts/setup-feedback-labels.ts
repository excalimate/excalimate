import { execFileSync } from 'node:child_process';
import { FEEDBACK_LABEL_DEFINITIONS } from '../src/lib/feedback/config.ts';

const owner = process.env.GITHUB_REPOSITORY_OWNER || 'excalimate';
const repository = process.env.GITHUB_REPOSITORY_NAME || 'excalimate';
const token =
  process.env.GITHUB_TOKEN ||
  execFileSync('gh', ['auth', 'token'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();

if (!token) throw new Error('Authenticate gh or set GITHUB_TOKEN before provisioning labels.');

const headers = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'excalimate-feedback-setup',
};
const baseUrl = `https://api.github.com/repos/${owner}/${repository}`;

async function github(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { ...headers, ...init.headers },
  });
  if (!response.ok) {
    throw new Error(`GitHub ${init.method || 'GET'} ${path} failed with ${response.status}.`);
  }
  return response;
}

const existing = new Set<string>();
for (let page = 1; ; page += 1) {
  const response = await github(`/labels?per_page=100&page=${page}`);
  const labels = (await response.json()) as Array<{ name: string }>;
  labels.forEach((label) => existing.add(label.name.toLocaleLowerCase()));
  if (labels.length < 100) break;
}

for (const label of FEEDBACK_LABEL_DEFINITIONS) {
  const exists = existing.has(label.name.toLocaleLowerCase());
  await github(exists ? `/labels/${encodeURIComponent(label.name)}` : '/labels', {
    method: exists ? 'PATCH' : 'POST',
    body: JSON.stringify(
      exists ? { new_name: label.name, color: label.color, description: label.description } : label,
    ),
  });
  console.log(`${exists ? 'Updated' : 'Created'} ${label.name}`);
}
