# Excalimate V2 release

Excalimate V2 is the stable `0.5.0` application and package release. It uses
project schema `2.0.0`, PlayerPackage `1.0.0`, and player runtime `1.0.0`.
Protocol versions change only when their
wire contracts become incompatible; the optional PlayerPackage preview and
opacity metadata remain backward compatible.

## Migration and recovery

All editor, template, share, export, player, and MCP entry points pass through
`@excalimate/project-schema`. The codec applies the one supported legacy-to-V2
migration, then strictly validates the canonical document, including actions,
authoring revisions, preferred workspace, scene states, tombstones, mappings,
files, and limits. Import does not maintain a second V2 model.

IndexedDB writes retain the last known-good project and recover interrupted
writes rather than replacing valid content with a partial document. Legacy
animated projects open in Studio; new and empty projects open in Magic.

## Package boundaries

| Package/entry                | Responsibility                                    | Must not contain                                   |
| ---------------------------- | ------------------------------------------------- | -------------------------------------------------- |
| `@excalimate/project-schema` | Codec, migration, limits, MCP transport schemas   | DOM, React, storage, network                       |
| `@excalimate/animation-core` | Deterministic compile, frame sampling, scene diff | DOM, editor stores, network                        |
| `@excalimate/player-runtime` | PlayerPackage codec, sanitizer, playback adapter  | Excalidraw, editor, exports, MCP, analytics        |
| `@excalimate/export-runtime` | Sampling, preflight, workers, animated SVG        | Editor UI and stores                               |
| `index.html`                 | Editor shell and lazy feature entries             | Eager export/template/Studio payloads              |
| `player.html`                | Hosted encrypted-share player                     | Excalidraw, PostHog, MCP, templates, file services |

`npm run check:player-bundle` enforces the player graph and a combined
JavaScript-plus-CSS limit of 150 KB gzip. `npm run check:export-bundle` keeps
format exporters dynamic and workers dedicated.

Reference package benchmarks on 2026-07-12 (Windows x64, AMD Ryzen 5 2600X,
12 logical CPUs, Node 22.17.1):

| Workload                                   |                              Result |
| ------------------------------------------ | ----------------------------------: |
| Playback, 200 elements / 1,000 keyframes   |                      0.155 ms/frame |
| Playback, 1,000 elements / 5,000 keyframes |                      0.321 ms/frame |
| Auto-animate, 49 / 199 / 999 elements      | 3,116 / 1,187 / 179 analyses/second |
| Scene diff, 1,000 / 10,000 elements        |                  2.44 ms / 18.63 ms |
| Sequence, derive 1,000 action rows         |                            0.590 ms |
| Sequence, move action / calculate window   |               0.0086 ms / 0.0001 ms |
| Share Worker dry-run bundle                |          40.14 KiB / 10.08 KiB gzip |

Player and export measurements and their explicit pass targets are recorded in
[hosted player](hosted-player.md) and
[export runtime](export-runtime.md), respectively.

## Staged rollout and rollback

1. Provision the share Worker prerequisites in
   [security and sharing](security-and-sharing.md), apply both R2 lifecycle
   rules, and verify `_headers` against the deployed origin.
2. Deploy the release build to an internal hostname. Exercise new/empty Magic,
   a migrated animated Studio project, Sequence, share/revoke, player embed,
   and each export format at mobile, tablet, and desktop widths.
3. Increase traffic in stages while monitoring client errors, share response
   codes, Worker quota pressure, export failures, and bundle sizes. Product
   behavior must not depend on PostHog availability or consent.
4. Stop rollout on schema recovery errors, silent render differences, CSP
   violations, share-origin rejection, or budget regressions.

Emergency rollback options:

- Set `VITE_FORCE_STUDIO_SHELL=true` and rebuild to route all editor projects
  through the legacy Studio shell.
- Use `?legacyStudio=1` or `?studio=legacy` for a per-link Studio rollback.
- Use `?legacySequence=1` or `VITE_FORCE_LEGACY_SEQUENCE=true` for the legacy
  Sequence path.
- Use `?workspace=magic`, `?workspace=sequence`, or `?workspace=studio` for
  targeted diagnosis.
- Roll back the static app independently of the share Worker. Do not remove the
  legacy R2 read binding until the documented drain window has ended.

## Release evidence

Run `npm test`, `npm run lint`, `npx tsc -b`, `npm run build`,
`npm run templates:validate`, both bundle checks, all `benchmark:*` scripts,
the MCP test/benchmark, the share Worker check and Wrangler dry run, and the
landing build. CI also generates a CycloneDX SBOM and runs npm package dry runs;
it does not publish or deploy.

Manual browser, NVDA, VoiceOver, TalkBack, and external animated-SVG host results
must be recorded separately. Their absence is a release limitation, not a
passing result.
