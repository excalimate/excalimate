# Excalimate Share Worker

Lightweight Cloudflare Worker + R2 for E2E encrypted animation sharing.

## How it works

1. Client encrypts project data with AES-256-GCM (key never leaves the browser)
2. Encrypted blob is uploaded to `POST /share` → stored in R2
3. Client builds URL: `https://app.excalimate.com/#share=<id>,<key>` (key in hash, never sent to server)
4. Recipient opens URL → blob fetched from `GET /share/<id>` → decrypted client-side

The server **only stores opaque encrypted blobs**. It cannot read, index, or analyze the content.

## Setup

### 1. Create the R2 bucket

```bash
cd share-worker
npx wrangler r2 bucket create excalimate-shares
```

### 2. Set up lifecycle rules (30-day auto-expiry)

In the Cloudflare dashboard:
1. Go to **R2** → **excalimate-shares** → **Settings**
2. Add a lifecycle rule: **Delete objects after 30 days**

### 3. Deploy

```bash
npm install
npm run deploy
```

The worker will be available at `https://excalimate-share.<your-subdomain>.workers.dev`.

### 4. Configure custom domain (optional)

In Cloudflare dashboard, add a custom domain route like `share.excalimate.com`.

## Local development

```bash
npm install
npm run dev
# → http://localhost:8787
```

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/share` | Upload encrypted blob. Body: `application/octet-stream`. Returns `{ id }` |
| `GET` | `/share/:id` | Download encrypted blob. Returns `application/octet-stream` |
| `GET` | `/health` | Health check |

## Configuration

Environment variables in `wrangler.jsonc`:

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_SHARE_SIZE_MB` | `10` | Maximum upload size in MB |
| `SHARE_TTL_DAYS` | `30` | Days before shares expire |
| `ALLOWED_ORIGINS` | `https://app.excalimate.com,...` | Comma-separated CORS origins |
