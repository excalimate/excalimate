interface ReserveRequest {
  id: string;
  size: number;
  expiresAt: number;
  maxShares: number;
  maxBytes: number;
}

interface ReleaseRequest {
  id: string;
}

interface QuotaRow extends Record<string, SqlStorageValue> {
  share_count: number;
  total_bytes: number;
}

const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const DAY_MS = 86_400_000;

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function isReserveRequest(value: unknown): value is ReserveRequest {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ReserveRequest>;
  return (
    typeof candidate.id === 'string' &&
    SHARE_ID_PATTERN.test(candidate.id) &&
    isPositiveSafeInteger(candidate.size) &&
    isPositiveSafeInteger(candidate.expiresAt) &&
    isPositiveSafeInteger(candidate.maxShares) &&
    isPositiveSafeInteger(candidate.maxBytes)
  );
}

function isReleaseRequest(value: unknown): value is ReleaseRequest {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ReleaseRequest>;
  return typeof candidate.id === 'string' && SHARE_ID_PATTERN.test(candidate.id);
}

function quotaExpiry(expiresAt: number): number {
  return Math.ceil(expiresAt / DAY_MS) * DAY_MS;
}

export class ShareQuota {
  private readonly state: DurableObjectState;
  private readonly sql: SqlStorage;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.sql = state.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS quota (
        singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
        share_count INTEGER NOT NULL DEFAULT 0 CHECK (share_count >= 0),
        total_bytes INTEGER NOT NULL DEFAULT 0 CHECK (total_bytes >= 0)
      );
      INSERT OR IGNORE INTO quota (singleton, share_count, total_bytes) VALUES (1, 0, 0);
      CREATE TABLE IF NOT EXISTS shares (
        id TEXT PRIMARY KEY,
        size INTEGER NOT NULL CHECK (size > 0),
        expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS shares_expiry ON shares (expires_at);
      CREATE TRIGGER IF NOT EXISTS shares_after_insert
      AFTER INSERT ON shares
      BEGIN
        UPDATE quota
        SET share_count = share_count + 1,
            total_bytes = total_bytes + NEW.size
        WHERE singleton = 1;
      END;
      CREATE TRIGGER IF NOT EXISTS shares_after_delete
      AFTER DELETE ON shares
      BEGIN
        UPDATE quota
        SET share_count = share_count - 1,
            total_bytes = total_bytes - OLD.size
        WHERE singleton = 1;
      END;
    `);
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed.' }, { status: 405 });
    }

    const pathname = new URL(request.url).pathname;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid request.' }, { status: 400 });
    }

    if (pathname === '/reserve') {
      if (!isReserveRequest(body)) {
        return Response.json({ error: 'Invalid request.' }, { status: 400 });
      }
      return Response.json({ accepted: await this.reserve(body) });
    }

    if (pathname === '/release') {
      if (!isReleaseRequest(body)) {
        return Response.json({ error: 'Invalid request.' }, { status: 400 });
      }
      this.sql.exec('DELETE FROM shares WHERE id = ?', body.id);
      return Response.json({ released: true });
    }

    return Response.json({ error: 'Not found.' }, { status: 404 });
  }

  async alarm(): Promise<void> {
    this.pruneExpired(Date.now());
    await this.scheduleNextAlarm();
  }

  private async reserve(request: ReserveRequest): Promise<boolean> {
    this.pruneExpired(Date.now());
    const quota = this.sql
      .exec<QuotaRow>('SELECT share_count, total_bytes FROM quota WHERE singleton = 1')
      .one();
    if (
      quota.share_count >= request.maxShares ||
      quota.total_bytes + request.size > request.maxBytes
    ) {
      return false;
    }

    const result = this.sql.exec(
      'INSERT OR IGNORE INTO shares (id, size, expires_at) VALUES (?, ?, ?)',
      request.id,
      request.size,
      quotaExpiry(request.expiresAt),
    );
    if (result.rowsWritten === 0) return false;

    await this.scheduleNextAlarm();
    return true;
  }

  private pruneExpired(now: number): void {
    this.sql.exec('DELETE FROM shares WHERE expires_at <= ?', now);
  }

  private async scheduleNextAlarm(): Promise<void> {
    const next = this.sql
      .exec<{ expires_at: number }>('SELECT expires_at FROM shares ORDER BY expires_at ASC LIMIT 1')
      .toArray()[0];
    if (!next) return;

    const currentAlarm = await this.state.storage.getAlarm();
    if (currentAlarm === null || currentAlarm !== next.expires_at) {
      await this.state.storage.setAlarm(next.expires_at);
    }
  }
}
