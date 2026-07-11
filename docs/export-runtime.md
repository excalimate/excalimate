# Export runtime

Excalimate V2 exports are local-first and client-side. `@excalimate/export-runtime` compiles the project timeline once with `@excalimate/animation-core`; MP4, WebM, GIF, animated SVG, Lottie, dotLottie, editor preview, and the hosted-player adapter consume the same frame-state semantics.

## Job contract

Every export has `start`, monotonic phased progress, `cancel`, completion/error state, resource estimates, capability detection, and deterministic cleanup. Phases are `preflight`, `prepare`, `render`, `encode`, `package`, and `download`.

Preflight validates dimensions, pixel count, FPS, clip duration, sample count, estimated raw frame bytes, peak memory, estimated output size, device-memory pressure, WebCodecs presence, and H.264/VP8/VP9 support. Unsupported codecs fail before rendering instead of silently changing formats.

Timeline frame-state generation uses a dedicated module Worker whenever Worker support is present. OffscreenCanvas is detected separately, but the current sanitized SVG/DOM raster adapter is not Worker-safe, so DOM rasterization and WebCodecs mux orchestration remain on the main thread and yield after every frame. GIF retains the gif.js encoder workers. Cancellation terminates the sampler worker, aborts GIF work, closes video frames/encoders and adapters, revokes object URLs, and rejects pending tasks.

## Animated SVG

Animated SVG is generated from the same sanitized `PlayerPackageV1` scene as hosted playback. The compiler has explicit `css-keyframes` and `smil` capability profiles.

- Output scales with source keyframes, not `duration × FPS`.
- Linear/common easing maps to native timing functions or key splines.
- Elastic, bounce, back, step edges, and other non-representable curves use bounded adaptive samples.
- Opacity, translation, scale, rotation, draw progress, nested groups, bound labels, transform origins, camera pan/zoom/rotation, clip range, and light/dark backgrounds share animation-core frame states.
- The source scene is sanitized before generated animation is inserted. Generated content cannot contain scripts, events, `foreignObject`, external references, or CSS URLs.

### Static fallback

The root viewBox, scene camera transform, target transforms/opacities, normalized draw state, and background are written as static poster attributes before active animation is added. If a host strips `<style>` or `<animate>`, the remaining SVG is the selected poster frame. This is a static fallback, not a claim that a given host preserves SVG animation.

## Host compatibility validation

Host behavior changes by product version, tenant policy, upload path, and import pipeline. The matrix deliberately distinguishes implemented fallback from externally verified active-animation behavior.

| Surface | Active animation evidence | Static poster behavior | Validation status |
| --- | --- | --- | --- |
| Chrome, Firefox, Safari | CSS and SMIL are standards-targeted profiles | Compiler-authored poster attributes remain without active nodes | Run the browser procedure for the release versions being supported |
| GitHub README | Not asserted; GitHub sanitization may change | Poster is designed to survive removal of active nodes | Upload a synthetic fixture to a private test repository and record rendered DOM/screenshot |
| Notion | Not asserted; upload and embed paths may differ | Same poster contract | Test both file upload and link/embed paths in the target workspace |
| Confluence | Not asserted; Cloud/Data Center and macro policy may differ | Same poster contract | Test the exact deployment/version and attachment/macro path |
| Presentation imports | Not asserted; Keynote, PowerPoint, and Google Slides import differently | Same poster contract when SVG itself is retained | Import the fixture into each target application/version and export a slide screenshot |

Validation procedure:

1. Export the synthetic compatibility fixture once with CSS keyframes and once with SMIL.
2. Open each file directly in the target browsers; verify poster at load, midpoint values, final values, camera crop, group/label transforms, and draw progress.
3. Inspect the loaded document for scripts, event attributes, external URLs, `foreignObject`, and unsafe CSS URLs; all must be absent.
4. Upload/import the same files to each host using the exact production path.
5. Record product/version, date, whether active nodes remain, whether animation runs, whether the poster remains, and a screenshot. Do not generalize one result to another host/version.
6. Repeat after host or sanitizer changes.

## Repeatable evidence

Run:

```text
npm run benchmark:export
npm run check:export-bundle
npm run benchmark:player
```

The export benchmark reports reference-device timeline sampling throughput, compiler time, compact SVG bytes versus the old sampled-keyframe approximation, cancellation acknowledgement against the 250 ms target, and the estimator's peak memory/output for a 1920×1080, 30 FPS, 10-second H.264 export. Results are machine-readable JSON so release measurements can be compared without fragile unit-test timing assertions.

Reference run on 2026-07-11 (Windows x64, AMD Ryzen 5 2600X, 12 logical CPUs, Node 22.17.1):

| Measurement | Result |
| --- | ---: |
| 120-second compiled-timeline sampling | 3,601 samples in 20.696 ms (173,993 samples/s) |
| 120-second compact animated SVG compile | 21.229 ms |
| Compact SVG size | 2,704 bytes / 21 emitted declarations |
| Old 60 FPS sampled approximation | 21,603 declarations / approximately 2,376,330 bytes |
| Compact/legacy approximate size ratio | 0.001 |
| Cancellation acknowledgement | 1.011 ms (target: less than 250 ms) |
| Estimated peak memory, 1920×1080 30 FPS 10-second H.264 | 33,177,600 bytes |
| Estimated output, 20 Mbps 10-second H.264 | 25,000,000 bytes |

This Node harness measures deterministic timeline/compiler throughput, not DOM rasterization or hardware codec speed. End-to-end MP4/WebM/GIF throughput must be recorded in the target browser because SVG image decode and WebCodecs performance are browser/GPU dependent; the estimator remains deterministic across those runs.
