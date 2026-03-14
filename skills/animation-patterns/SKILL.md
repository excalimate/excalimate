---
name: animation-patterns
description: >
  Comprehensive animation recipe book for the Excalimate MCP server. Use when adding
  keyframe animations to Excalidraw diagrams — covers fade-in reveals, slide-in
  movements, pop-in scale effects, arrow draw-on strokes, camera pan/zoom, staggered
  multi-element sequences, and timing/easing selection. Essential for creating
  professional animated diagrams, presentations, and explainer content.
---

# Animation Patterns

Core animation recipes for the Excalimate MCP server. Apply these patterns to any Excalidraw diagram to create professional animated reveals, flows, and presentations.

## Animatable Properties

| Property | Range | Default | Use |
|----------|-------|---------|-----|
| `opacity` | 0–1 | 1 | Fade in/out |
| `translateX` | pixels | 0 | Horizontal slide |
| `translateY` | pixels | 0 | Vertical slide |
| `scaleX` | 0.1+ | 1 | Horizontal scale |
| `scaleY` | 0.1+ | 1 | Vertical scale |
| `rotation` | degrees | 0 | Spin |
| `drawProgress` | 0–1 | 1 | Arrow/line stroke draw-on |

---

## The 5 Core Animation Patterns

Every diagram animation is built from these five primitives. Combine them to create complex choreography.

### 1. Fade In

The simplest reveal — element appears from transparent to opaque.

```json
[
  {"targetId":"el","property":"opacity","time":0,"value":0},
  {"targetId":"el","property":"opacity","time":500,"value":1,"easing":"easeOut"}
]
```

Adjust duration 300–800ms depending on element size. Shorter for small icons, longer for large shapes.

### 2. Slide In

Movement combined with fade for a directional entrance.

**Slide from left:**
```json
[
  {"targetId":"el","property":"translateX","time":0,"value":-200},
  {"targetId":"el","property":"translateX","time":700,"value":0,"easing":"easeOutCubic"},
  {"targetId":"el","property":"opacity","time":0,"value":0},
  {"targetId":"el","property":"opacity","time":400,"value":1,"easing":"easeOut"}
]
```

**Variations — change the first two keyframes:**
- Slide from right: `translateX` 0→`+200`, 700→`0`
- Slide from top: `translateY` 0→`-150`, 700→`0`
- Slide from bottom: `translateY` 0→`+150`, 700→`0`

The opacity fade finishes before the slide, creating a smooth arrival effect.

### 3. Pop In

Scale bounce effect — element grows from small with an overshoot.

```json
[
  {"targetId":"el","property":"scaleX","time":0,"value":0.3,"scaleOrigin":"center"},
  {"targetId":"el","property":"scaleX","time":500,"value":1,"easing":"easeOutBack","scaleOrigin":"center"},
  {"targetId":"el","property":"scaleY","time":0,"value":0.3,"scaleOrigin":"center"},
  {"targetId":"el","property":"scaleY","time":500,"value":1,"easing":"easeOutBack","scaleOrigin":"center"},
  {"targetId":"el","property":"opacity","time":0,"value":0},
  {"targetId":"el","property":"opacity","time":300,"value":1,"easing":"easeOut"}
]
```

**IMPORTANT:** `scaleOrigin` must be set on EACH scale keyframe. If omitted, scaling will anchor to top-left corner instead of center.

**`scaleOrigin` values:** `center`, `top-left`, `top-right`, `bottom-left`, `bottom-right`, `top`, `bottom`, `left`, `right`

### 4. Arrow Draw-On

Progressive stroke reveal — the arrow/line draws itself from start to end.

```json
[
  {"targetId":"arr","property":"opacity","time":0,"value":0},
  {"targetId":"arr","property":"opacity","time":0,"value":1},
  {"targetId":"arr","property":"drawProgress","time":0,"value":0},
  {"targetId":"arr","property":"drawProgress","time":1000,"value":1,"easing":"easeInOut"}
]
```

`drawProgress` only works on arrows and lines. Always pair with an instant opacity reveal (both keyframes at time 0) so the arrow is visible as it draws. Duration 800–1500ms — scale with arrow length.

### 5. Camera Pan

Viewport movement to guide the viewer across the canvas.

```json
add_camera_keyframes_batch({ keyframes: '[
  {"property":"x","time":0,"value":0},
  {"property":"x","time":2000,"value":800,"easing":"easeInOutCubic"},
  {"property":"y","time":0,"value":0},
  {"property":"y","time":2000,"value":0}
]' })
```

Camera keyframes have no `targetId` — the camera is implicit. Properties are `x`, `y` (position) and `width` (zoom level). See [camera-choreography.md](references/camera-choreography.md) for zoom and combined patterns.

---

## Reveal Sequence Pattern

The most common animation: **Source → Arrow → Target**. This shows a connection flowing between two elements.

```json
[
  // Phase 1: Source shape fades in (0–500ms)
  {"targetId":"source","property":"opacity","time":0,"value":0},
  {"targetId":"source","property":"opacity","time":500,"value":1,"easing":"easeOut"},

  // Phase 2: Arrow draws on (500–1500ms)
  {"targetId":"arrow1","property":"opacity","time":500,"value":0},
  {"targetId":"arrow1","property":"opacity","time":500,"value":1},
  {"targetId":"arrow1","property":"drawProgress","time":500,"value":0},
  {"targetId":"arrow1","property":"drawProgress","time":1500,"value":1,"easing":"easeInOut"},

  // Phase 3: Target shape fades in (1500–2000ms)
  {"targetId":"target","property":"opacity","time":0,"value":0},
  {"targetId":"target","property":"opacity","time":1500,"value":0},
  {"targetId":"target","property":"opacity","time":2000,"value":1,"easing":"easeOut"}
]
```

**Timing logic:**
1. Source appears first (0–500ms)
2. Arrow starts drawing after source is visible (500ms)
3. Target appears after arrow finishes (1500ms)
4. Set `clip_range` to `{start:0, end:2500}` (last keyframe + 500ms padding)

Chain additional arrows/nodes by continuing the pattern with incremented time offsets.

---

## Staggered Reveal

Use `create_sequence` to auto-generate staggered fade-in keyframes for multiple elements:

```
create_sequence({
  elementIds: ["e1","e2","e3","e4"],
  property: "opacity",
  startTime: 0,
  delay: 400,
  duration: 600
})
```

This generates: e1 fades in at 0–600ms, e2 at 400–1000ms, e3 at 800–1400ms, e4 at 1200–1800ms.

Element order in the array determines reveal order. See [stagger-patterns.md](references/stagger-patterns.md) for spatial ordering strategies and manual stagger techniques.

---

## Easing Quick Reference

| Effect | Recommended Easing | Why |
|--------|-------------------|-----|
| Fade in | `easeOut` | Gentle arrival |
| Slide in | `easeOutCubic` | Smooth deceleration |
| Pop in | `easeOutBack` | Overshoot bounce |
| Camera motion | `easeInOutCubic` | Smooth start and end |
| Arrow draw | `easeInOut` | Natural stroke feel |
| Instant jump | `step` | No interpolation |
| Elastic bounce | `easeOutElastic` | Playful spring |
| Bounce landing | `easeOutBounce` | Gravity effect |

Full easing function reference with curves and use cases: [easing-guide.md](references/easing-guide.md)

---

## Timing Guidelines

| Animation | Duration | Notes |
|-----------|----------|-------|
| Fade in | 300–800ms | Shorter for small, longer for large |
| Arrow draw | 800–1500ms | Scale with arrow length |
| Slide in | 600–1000ms | Shorter for nearby, longer for distant |
| Pop in | 400–700ms | Quick for small, slower for emphasis |
| Camera pan | 1500–3000ms | Scale with distance |
| Stagger delay | 200–500ms | Time between sequential reveals |
| Reading pause | 1000–2000ms | Time for viewer to read content |

Complete timing recipes for common diagram types: [timing-recipes.md](references/timing-recipes.md)

---

## Key Rules

- **Use `add_keyframes_batch`** — one call for many keyframes is much faster than individual calls
- **Set opacity 0 at time 0** for all elements that should appear later in the animation
- **Bound text inherits container animation** — labels inside shapes move with the shape; never animate labels separately
- **`drawProgress` only works on arrows and lines** — using it on other elements has no effect
- **Always call `set_clip_range({start:0, end:lastKeyframeTime + 500})`** — the 500ms padding gives breathing room at the end
- **Verify with `animations_of_item({targetId:"id"})`** to inspect and debug animation setup on any element

---

## Reference Files

| File | Content |
|------|---------|
| [easing-guide.md](references/easing-guide.md) | All 18 easing functions with motion descriptions and use cases |
| [timing-recipes.md](references/timing-recipes.md) | Complete timing blueprints for 6 common diagram scenarios |
| [camera-choreography.md](references/camera-choreography.md) | Camera setup, pan, zoom, and combined patterns |
| [stagger-patterns.md](references/stagger-patterns.md) | Multi-element reveal ordering and wave patterns |
| [advanced-patterns.md](references/advanced-patterns.md) | Combined transforms, emphasis, elastic, bounce, and more |
