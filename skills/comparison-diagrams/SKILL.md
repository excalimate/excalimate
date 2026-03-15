---
name: comparison-diagrams
description: >
  Create animated comparison diagrams showing before/after states or side-by-side
  alternatives using the Excalimate MCP server. Use when asked to compare architectures,
  show migration paths, visualize before/after changes, present alternatives, pros/cons,
  or any A-vs-B visual comparison — even if the user says "what changed" or "show the
  difference."
---

# Comparison Diagrams

Create animated diagrams that visually compare two states, architectures, or alternatives.
Comparison diagrams make differences immediately obvious through layout, color coding, and
sequential animation that guides the viewer's eye to what changed.

## Comparison Workflow

1. **Identify the two states or alternatives** — label them A and B (Before/After, Old/New, Option 1/Option 2).
2. **Choose a layout** — side-by-side for structural comparison, sequential for transformation stories.
3. **Create both sets of elements** — mirror positioning so viewers can scan across easily.
4. **Classify every element** — addition, removal, change, or unchanged.
5. **Animate to highlight differences** — reveal both states, then draw attention to what differs.

## Side-by-Side Layout

Place two panels next to each other with a vertical divider.

| Region       | x      | y    | Width | Purpose              |
|-------------|--------|------|-------|----------------------|
| Left panel  | 50     | 100  | 700   | State A (Before)     |
| Divider     | 800    | 50   | 2     | Vertical separator   |
| Right panel | 850    | 100  | 700   | State B (After)      |
| Label A     | 300    | 30   | —     | "Before" / "Option A"|
| Label B     | 1100   | 30   | —     | "After" / "Option B" |

Both panels should **mirror the same internal layout** — if a box sits at relative
position (100, 80) in panel A, its counterpart should sit at (100, 80) in panel B.
This lets the viewer's eye jump horizontally to spot differences.

```json
{
  "elements": [
    { "id": "label-a", "type": "text", "x": 300, "y": 30, "text": "Before", "fontSize": 28, "fontFamily": 3, "textAlign": "center" },
    { "id": "label-b", "type": "text", "x": 1100, "y": 30, "text": "After", "fontSize": 28, "fontFamily": 3, "textAlign": "center" },
    { "id": "divider", "type": "line", "x": 800, "y": 50, "width": 0, "height": 600, "strokeColor": "#868e96", "strokeWidth": 2, "strokeStyle": "dashed" }
  ]
}
```

## Sequential Layout

State A and State B occupy the **same canvas region**. Elements transition in place.

| Phase            | Time (ms)   | What happens                          |
|-----------------|-------------|---------------------------------------|
| Reveal A        | 0 – 2000    | State A elements fade/slide in        |
| Reading pause   | 2000 – 3500 | Viewer absorbs State A                |
| Transition      | 3500 – 5500 | Removals fade out, additions fade in  |
| Settle          | 5500 – 6000 | Final state holds                     |

All elements share the same coordinate space (e.g., centered around x=400, y=300).
Unchanged elements stay in place; only differing elements animate.

## Diff Highlighting

Color-code every element by its diff status:

| Status    | Stroke    | Background | Stroke Width |
|-----------|-----------|------------|-------------|
| Addition  | `#2f9e44` | `#b2f2bb`  | 3–4 px      |
| Removal   | `#e03131` | `#ffc9c9`  | 3–4 px      |
| Change    | `#f08c00` | `#ffec99`  | 3–4 px      |
| Unchanged | `#868e96` | `#e9ecef`  | 1–2 px      |

> Apply diff colors **only in the panel or phase where the difference matters**.
> In State A, removals are red. In State B, additions are green. Changes are orange in both.

See [diff-highlighting.md](references/diff-highlighting.md) for full color recipes and
highlight animation patterns.

## Animation Strategy — Side-by-Side

### Phase 1: Reveal (0 – 1500 ms)

Both panels fade in simultaneously so the viewer sees the full picture.

```json
[
  { "elementId": "panel-a-group", "property": "opacity", "keyframes": [
    { "time": 0, "value": 0, "easing": "easeOutCubic" },
    { "time": 1000, "value": 1 }
  ]},
  { "elementId": "panel-b-group", "property": "opacity", "keyframes": [
    { "time": 300, "value": 0, "easing": "easeOutCubic" },
    { "time": 1300, "value": 1 }
  ]},
  { "elementId": "divider", "property": "opacity", "keyframes": [
    { "time": 0, "value": 0, "easing": "easeOutCubic" },
    { "time": 800, "value": 1 }
  ]}
]
```

### Phase 2: Highlight Differences (1500 ms+)

Sequentially pulse each differing element pair to draw attention.

```json
[
  { "elementId": "removed-box", "property": "scaleX", "keyframes": [
    { "time": 1500, "value": 1, "easing": "easeInOutQuad" },
    { "time": 1800, "value": 1.05 },
    { "time": 2100, "value": 1, "easing": "easeInOutQuad" }
  ]},
  { "elementId": "removed-box", "property": "scaleY", "keyframes": [
    { "time": 1500, "value": 1, "easing": "easeInOutQuad" },
    { "time": 1800, "value": 1.05 },
    { "time": 2100, "value": 1, "easing": "easeInOutQuad" }
  ]},
  { "elementId": "added-box", "property": "scaleX", "keyframes": [
    { "time": 2200, "value": 1, "easing": "easeInOutQuad" },
    { "time": 2500, "value": 1.05 },
    { "time": 2800, "value": 1, "easing": "easeInOutQuad" }
  ]},
  { "elementId": "added-box", "property": "scaleY", "keyframes": [
    { "time": 2200, "value": 1, "easing": "easeInOutQuad" },
    { "time": 2500, "value": 1.05 },
    { "time": 2800, "value": 1, "easing": "easeInOutQuad" }
  ]}
]
```

## Animation Strategy — Sequential

### Phase 1: Reveal State A (0 – 2000 ms)

Fade in all State A elements with a staggered cascade.

```json
[
  { "elementId": "a-box-1", "property": "opacity", "keyframes": [
    { "time": 0, "value": 0, "easing": "easeOutCubic" },
    { "time": 600, "value": 1 }
  ]},
  { "elementId": "a-box-2", "property": "opacity", "keyframes": [
    { "time": 200, "value": 0, "easing": "easeOutCubic" },
    { "time": 800, "value": 1 }
  ]},
  { "elementId": "a-arrow-1", "property": "drawProgress", "keyframes": [
    { "time": 800, "value": 0, "easing": "easeInOutQuad" },
    { "time": 1400, "value": 1 }
  ]}
]
```

### Phase 2: Reading Pause (2000 – 3500 ms)

No animations — let the viewer absorb State A.

### Phase 3: Transition (3500 – 5500 ms)

Removals fade out with red tint, additions fade in with green tint, changes morph.

```json
[
  { "elementId": "removed-svc", "property": "opacity", "keyframes": [
    { "time": 3500, "value": 1, "easing": "easeInQuad" },
    { "time": 4500, "value": 0 }
  ]},
  { "elementId": "added-svc", "property": "opacity", "keyframes": [
    { "time": 4500, "value": 0, "easing": "easeOutCubic" },
    { "time": 5500, "value": 1 }
  ]},
  { "elementId": "changed-box", "property": "translateX", "keyframes": [
    { "time": 4500, "value": 0, "easing": "easeInOutCubic" },
    { "time": 5500, "value": 120 }
  ]}
]
```

## Complete Example — Monolith → Microservices

A side-by-side comparison showing a monolith architecture migrating to microservices.

### Step 1: Create the scene

Call `create_scene` with all elements for both panels:

- **Left panel (Before):** Single large "Monolith" rectangle, single "DB" cylinder, arrow connecting them.
- **Right panel (After):** Three smaller service rectangles ("Auth", "API", "Worker"), an "API Gateway" box, individual DB icons, arrows connecting each service to its DB and the gateway.
- **Divider** and **labels** as shown in the Side-by-Side Layout section.

Mark the monolith box with removal colors (`#e03131` stroke, `#ffc9c9` bg) on the left.
Mark new microservice boxes with addition colors (`#2f9e44` stroke, `#b2f2bb` bg) on the right.
Keep the DB with change colors (`#f08c00` stroke, `#ffec99` bg) since it splits.

### Step 2: Add keyframes

Use `add_keyframes_batch` with the side-by-side animation strategy:

1. Fade in both panels (0–1300 ms).
2. Pulse the monolith box red (1500–2100 ms).
3. Pulse each microservice box green sequentially (2200–3400 ms, 400 ms apart).
4. Pulse the DB elements orange (3500–4100 ms).

### Step 3: Camera framing

Call `set_camera_frame` to fit both panels with padding:

```json
{ "x": 0, "y": 0, "width": 1600, "height": 750 }
```

### Step 4: Finalize

Call `set_clip_range` with `{ "startMs": 0, "endMs": 5000 }` and `save_checkpoint` (or `share_project` for an E2E encrypted share URL).

## Key Rules

- **Mirror element positions** across panels so the eye can scan horizontally.
- **Always apply diff colors** — never leave the viewer guessing what changed.
- **Animate differences last** — reveal the full picture first, then highlight diffs.
- **Use reading pauses** in sequential layouts — at least 1500 ms between phases.
- **Keep strokes thick (3–4 px)** on differing elements so colors are visible.
- **Label both states clearly** — never rely solely on position to convey meaning.
- **Limit to 2 states** per diagram — for 3+ states, chain multiple comparisons.

## Reference Files

| File | Description |
|------|-------------|
| [comparison-layouts.md](references/comparison-layouts.md) | Coordinate templates for side-by-side, top/bottom, and split-center layouts |
| [diff-highlighting.md](references/diff-highlighting.md) | Color conventions, stroke rules, and highlight animation JSON examples |
| [transition-recipes.md](references/transition-recipes.md) | Cross-fade, slide-over, morph, and wipe transition patterns with keyframes |
