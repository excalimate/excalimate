# Excalimate Share Worker

Cloudflare Worker, R2, and a SQLite-backed Durable Object for end-to-end encrypted
animation sharing.

## Security model

1. The browser compresses project JSON and encrypts it with AES-256-GCM.
2. `POST /share` stores only the opaque ciphertext in R2.
3. The response returns a 128-bit share ID, exact `expiresAt`, and a 256-bit
   deletion capability.
4. The browser puts only the AES key in the URL fragment. URL fragments are not
   sent in HTTP requests.
5. R2 metadata stores only the SHA-256 verifier for the deletion capability.

The service cannot decrypt, index, or analyze a shared project. Do not log upload
bodies, URL fragments, authorization headers, or deletion capabilities.

## API

| Method   | Path         | Description                                                                  |
| -------- | ------------ | ---------------------------------------------------------------------------- |
| `POST`   | `/share`     | Upload `application/octet-stream`; returns `{ id, expiresAt, deleteSecret }` |
| `GET`    | `/share/:id` | Download immutable `application/octet-stream` ciphertext                     |
| `DELETE` | `/share/:id` | Delete with `Authorization: Bearer <deleteSecret>`                           |
| `GET`    | `/health`    | Health check                                                                 |

Write requests and preflights require an exact origin from `ALLOWED_ORIGINS`.
Share IDs are exactly 22 base64url characters. Upload bodies are bounded while
streaming even when `Content-Length` is absent.

Deletion prevents new Worker reads after R2 deletion. It cannot erase copies that
a recipient already downloaded, decrypted, or retained in a browser cache.

## Quota and cost controls

`ShareQuota` is one globally named SQLite-backed Durable Object. It reserves exact
object bytes before each R2 write and enforces both `MAX_TOTAL_SHARES` and
`MAX_TOTAL_STORAGE_MB`. Failed R2 writes roll back the reservation. Deletes and
daily expiry alarms release capacity.

New writes use the `excalimate-shares-v2` bucket, so the quota starts from an
empty, known baseline. The original `excalimate-shares` bucket is bound read-only
for legacy 8-character links while its existing 30-day retention window drains.
Remove `LEGACY_SHARE_BUCKET` only after every object that predates this deployment
has expired.

Public `GET` requests never call the Durable Object, so cached and uncached reads
do not add quota storage operations. Each successful upload uses one Durable
Object request plus a small number of indexed SQLite row operations; deletion uses
one more request. This is more expensive than a process-local counter but provides
strong, restart-safe admission control and a hard storage ceiling. Cloudflare
offers SQLite-backed Durable Objects on Workers Free and Paid plans; configure
billing alerts for R2, Workers, and Durable Objects.

## Initial deployment

From `share-worker`:

```bash
npm ci
npx wrangler login
npx wrangler r2 bucket create excalimate-shares-v2
npm run lifecycle:apply
npm run deploy
```

The deploy applies the `v1` SQLite Durable Object migration from
`wrangler.jsonc`. The API token needs Workers deployment and R2 Storage Write
permissions.

The legacy `excalimate-shares` bucket must already exist. For a completely new
installation, create it as well. Apply and verify lifecycle policies before
deploying:

```bash
npm run lifecycle:apply
npx wrangler r2 bucket lifecycle list excalimate-shares-v2
npx wrangler r2 bucket lifecycle list excalimate-shares
npm run deploy
```

Cloudflare lifecycle deletion may run up to 24 hours after an object's 30-day age.
The Worker independently enforces the exact `expiresAt` metadata timestamp, so an
expired object is inaccessible while physical cleanup is pending.

`r2-lifecycle.json` and `SHARE_TTL_DAYS` must remain aligned. If retention changes,
update both values and reapply the lifecycle policy.

Originless uploads are intentionally rejected. Existing non-browser clients,
including the current MCP `share_project` tool, need a separately authenticated
server-to-server upload contract before they can use this hardened endpoint; that
client change is outside this worker and app PR.

## Configuration

| Variable               | Default                          | Description                                                                    |
| ---------------------- | -------------------------------- | ------------------------------------------------------------------------------ |
| `MAX_SHARE_SIZE_MB`    | `2`                              | Maximum ciphertext body size                                                   |
| `SHARE_TTL_DAYS`       | `30`                             | Logical share lifetime                                                         |
| `MAX_TOTAL_SHARES`     | `2000`                           | Durable maximum live reservation count                                         |
| `MAX_TOTAL_STORAGE_MB` | `4096`                           | Durable maximum reserved ciphertext bytes                                      |
| `ALLOWED_ORIGINS`      | production and local app origins | Exact comma-separated HTTPS origins; localhost HTTP is allowed for development |

Configuration is parsed strictly. Wildcard origins, malformed numbers, invalid
URLs, and unsafe ranges fail closed with a sanitized `503` response.

## Local development

```bash
npm ci
npm run dev
```

Wrangler provides local R2 and Durable Object bindings. The configured
`http://localhost:5173` origin supports the Vite development app.
