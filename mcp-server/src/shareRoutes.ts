import type { Express, Request, Response } from 'express';
import type { RateLimitRequestHandler } from 'express-rate-limit';
import crypto from 'node:crypto';
import express from 'express';

export function registerShareRoutes(app: Express, shareLimiter: RateLimitRequestHandler): void {
  const shareStore = new Map<string, Buffer>();
  const MAX_SHARE_SIZE = 10 * 1024 * 1024; // 10 MB
  const MAX_SHARES = 500;

  // Upload encrypted blob
  app.post('/share', shareLimiter, express.raw({ type: 'application/octet-stream', limit: '10mb' }), (req: Request, res: Response) => {
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    const rawBody = req.body as unknown;
    if (!Buffer.isBuffer(rawBody)) {
      res.status(400).json({ error: 'Empty body. Send as application/octet-stream.' });
      return;
    }
    const body = rawBody as Buffer;
    if (body.length === 0) {
      res.status(400).json({ error: 'Empty body. Send as application/octet-stream.' });
      return;
    }
    if (body.length > MAX_SHARE_SIZE) {
      res.status(413).json({ error: 'Payload too large' });
      return;
    }
    // Evict oldest if over limit
    if (shareStore.size >= MAX_SHARES) {
      const oldest = shareStore.keys().next().value;
      if (oldest !== undefined) shareStore.delete(oldest);
    }
    shareStore.set(id, body);
    res.json({ id, url: `/share/${id}` });
  });

  // Download encrypted blob
  app.get('/share/:id', (req: Request, res: Response) => {
    const data = shareStore.get(req.params.id as string);
    if (!data) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.set('Content-Type', 'application/octet-stream');
    res.send(data);
  });
}
