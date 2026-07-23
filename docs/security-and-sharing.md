# Security, privacy, and sharing

## Trust boundaries

| Input                     | Enforcement                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| Files and legacy projects | Byte/type limits, one migration path, strict V2 codec, IndexedDB recovery                  |
| Templates                 | Local paths, byte limits, SHA-256 integrity, strict project/PlayerPackage validation       |
| Share ciphertext          | Bounded download, AES-GCM authentication, strict envelope/project/player parsing           |
| SVG and PlayerPackage     | Script/event/foreign-object/external-reference sanitization, strict CSP                    |
| MCP snapshot/delta        | Transfer limits, shared schemas, revision/sequence recovery                                |
| `postMessage`             | Disabled without exact configured origins; channel, source, origin, and command validation |
| Workers/encoders          | Dedicated routes, cancellation, termination/close, object-URL cleanup                      |

No surface inserts untrusted raw HTML. Analytics events contain feature and
performance metadata, not diagram/project/SVG/share contents, encryption keys,
delete capabilities, or stack traces. Product behavior does not depend on
analytics initialization or consent.

## Encrypted sharing

The browser encrypts one V2 share envelope with AES-256-GCM. The Worker stores
only ciphertext under a 128-bit random ID. The URL fragment carries the
encryption key and is cleared by the player after capture; fragments are not
sent in HTTP requests. The 256-bit delete capability is returned only to the
creating browser, kept out of the public URL, and sent in the delete
authorization header.

Writes require an exact configured browser origin. Reads remain available for
the legacy bucket during the drain period. MCP does not upload shares or spoof a
browser origin.

## Worker deployment prerequisites

Before rollout:

1. Create R2 buckets `excalimate-shares-v2` and `excalimate-shares`.
2. Provision the `ShareQuota` Durable Object and apply migration tag `v1`.
3. Review `MAX_SHARE_SIZE_MB`, `SHARE_TTL_DAYS`, total-share/storage quotas,
   `MAX_SHARES_PER_CLIENT`, and exact `ALLOWED_ORIGINS` in
   `share-worker/wrangler.jsonc`.
4. Generate an independent high-entropy HMAC key and store it with
   `npx wrangler secret put CLIENT_ID_HASH_KEY`. The Worker hashes Cloudflare's
   trusted `CF-Connecting-IP` value before the global Durable Object stores a
   client reservation; raw addresses are never persisted.
5. Run `npm run lifecycle:apply` from `share-worker/` to apply the 30-day rule
   to both current and legacy buckets.
6. Set `VITE_SHARE_API_URL` to the Worker origin and update the matching
   `connect-src` in `public/_headers`.
7. Run `npm run check` and `npx wrangler deploy --dry-run`; do not deploy from
   release-candidate validation.

The editor routes `/` and `/index.html` use `frame-ancestors 'none'`. The
separate `/player.html` policy is intentionally embeddable over HTTPS and keeps
least-privilege script, connect, image, font, worker, frame, object, base, and
form directives. All three routes retain HSTS, nosniff, referrer,
permissions, and CORP headers.

## Incident and retention operations

Revoke with the in-memory delete capability when available. Expiry is also
shown to the creator. Lifecycle deletion is the durable backstop; application
metadata alone is not a retention control. Keep the legacy read bucket and its
lifecycle policy until the drain window ends, then remove the binding in a
separate reviewed change.
