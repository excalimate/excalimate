# Hosted player

The hosted player is the isolated `player.html` entry. It accepts only an
encrypted Excalimate share fragment:

```text
https://excalimate.com/player.html#share=SHARE_ID,ENCRYPTION_KEY
```

The key remains in the URL fragment and browser memory. The player clears the
fragment after capture, fetches ciphertext only from `VITE_SHARE_API_URL`, and
never posts project, SVG, share, key, or deletion-capability data to a parent.
Project-only legacy shares show an **Open in Excalimate** fallback rather than
loading Excalidraw.

## Embedding

Use a sandbox and grant only the capabilities required by the controls:

```html
<iframe
  src="https://excalimate.com/player.html#share=SHARE_ID,ENCRYPTION_KEY"
  title="Excalimate animation"
  sandbox="allow-scripts allow-same-origin allow-top-navigation-by-user-activation"
  allow="fullscreen"
  allowfullscreen
  referrerpolicy="no-referrer"
></iframe>
```

Configure `VITE_PLAYER_ALLOWED_ORIGINS` as a comma-separated list of exact
origins to enable the optional postMessage API. Wildcards, paths, credentials,
and non-HTTP(S) origins are rejected. Mirror the intended embed origins in the
`frame-ancestors` directive for `/player.html`; the checked-in HTTPS-only policy
is intentionally broader than the disabled-by-default message API so static
embeds work without exposing control commands.

Commands use the `excalimate-player-v1` channel and are limited to `play`,
`pause`, `seek`, `rate`, and `state`. Events contain only playback state or a
safe error string. The parent window and exact origin must both match.

## Security headers

The editor is served only at `/` or `/index.html` and remains frame-denied.
`wrangler.jsonc` disables SPA fallback so an uncovered path cannot serve an
embeddable editor document. The player has its own CSP, cross-origin resource
policy, permissions policy, referrer policy, HSTS, and nosniff headers.

Do not combine `frame-ancestors 'none'` and the player policy: browsers enforce
both and the player would remain unembeddable. If the share service origin
changes, update both `VITE_SHARE_API_URL` and the player `connect-src`
directive; automated header assertions keep the checked-in default synchronized.

## Repeatable performance report

Run:

```sh
npm run benchmark:player
```

The command builds all entries, rejects forbidden editor modules in the loaded
player graph, reports the complete player JS/CSS graph and enforces the 150 KB
combined gzip budget, then reports first-frame
and steady-state results for 200 elements and 1,000 keyframes. The mobile figure
is a deterministic 4x CPU-cost projection.
Record network first-frame separately with browser throttling set to fast 4G
(1.6 Mbps down, 750 Kbps up, 150 ms RTT) and a warm share-worker connection;
encrypted payload/assets are excluded from the bundle budget.

Reference run on 2026-07-12 (Windows x64, AMD Ryzen 5 2600X, 12 logical CPUs,
Node 22.17.1):

| Measurement                                   | Result                         |
| --------------------------------------------- | -----------------------------: |
| Loaded JavaScript                             |            116,158 bytes gzip |
| Loaded CSS                                    |              9,172 bytes gzip |
| Combined player graph                         | 125,330 / 153,600 bytes (pass) |
| First frame, 200 elements / 1,000 keyframes   | 24.529 ms (target: <1,500 ms) |
| Average frame, 600 measured frames            |                       0.089 ms |
| Desktop deterministic sampling projection     |     11,220 FPS (target: >=55) |
| Mobile deterministic 4x CPU-cost projection   |      2,805 FPS (target: >=28) |

These runtime figures measure deterministic package parsing and sampling, not
network, DOM paint, or GPU compositing.
