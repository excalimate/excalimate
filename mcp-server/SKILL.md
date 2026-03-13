---
name: animate-excalidraw
description: >
  Create hand-drawn Excalidraw diagrams and animate them with keyframe animations
  using the animate-excalidraw MCP server. Use this skill when asked to create
  animated diagrams, architecture visualizations, flow animations, reveal sequences,
  or any animated Excalidraw content. Supports opacity fades, position slides,
  scale pop-ins, arrow draw-on effects, camera pan/zoom, and staggered reveals.
---

# Animate-Excalidraw Skill

## Workflow

1. Call `read_me` for element format reference
2. Call `get_examples` for animation patterns
3. Call `clear_scene` if starting fresh, then `create_scene` with elements JSON
4. Call `add_keyframes_batch` to animate (preferred over individual `add_keyframe`)
5. Call `set_clip_range` to define export bounds
6. Call `save_checkpoint` to persist for the user

## Quick Element Reference

**Rectangle**: `{"id":"r1","type":"rectangle","x":100,"y":100,"width":200,"height":100,"strokeColor":"#1e1e1e","backgroundColor":"#a5d8ff","fillStyle":"solid"}`

**Text**: `{"id":"t1","type":"text","x":100,"y":100,"width":200,"height":30,"text":"Hello","fontSize":20,"fontFamily":5,"textAlign":"center"}`

**Arrow**: `{"id":"a1","type":"arrow","x":100,"y":200,"width":300,"height":0,"points":[[0,0],[300,0]],"endArrowhead":"arrow"}`

**Bound arrow** (connects shapes): Add `"startBinding":{"elementId":"shapeA","focus":0,"gap":1},"endBinding":{"elementId":"shapeB","focus":0,"gap":1}` to the arrow, and `"boundElements":[{"id":"a1","type":"arrow"}]` to both shapes.

**Labeled shape**: Shape gets `"boundElements":[{"id":"label","type":"text"}]`, text gets `"containerId":"shape-id"`.

## Animation Properties

| Property | Range | Use |
|----------|-------|-----|
| `opacity` | 0–1 | Fade in/out |
| `translateX/Y` | pixels | Slide movement |
| `scaleX/Y` | 0.1+ | Pop in/out |
| `rotation` | degrees | Spin |
| `drawProgress` | 0–1 | Arrow/line stroke draw-on |

## Common Patterns

### Reveal: A → Arrow → B
```
add_keyframes_batch with:
  A opacity: 0→1 (0–600ms, easeOut)
  arrow opacity: 0→1 (600–700ms) + drawProgress: 0→1 (600–1800ms, easeInOut)
  B opacity: 0→1 (1800–2400ms, easeOut)
```

### Staggered reveal (shortcut)
```
create_sequence({ elementIds: ["el1","el2","el3"], property: "opacity", startTime: 0, delay: 400, duration: 600 })
```

### Slide in
```
translateX: -300→0 (easeOutCubic) + opacity: 0→1 (easeOut, shorter)
```

### Pop in (from center)
```
add_keyframes_batch — add "scaleOrigin":"center" on each scaleX/scaleY keyframe
scaleX/Y: 0.3→1 (easeOutBack) + opacity: 0→1
```

### Scale from edge
```
add_scale_animation({ targetId, origin: "bottom", keyframes: '[{time, scaleX, scaleY, easing}]' })
— or add "scaleOrigin":"bottom" per keyframe in add_keyframes_batch
```
Origins: center, top-left, top-right, bottom-left, bottom-right, top, bottom, left, right

## Key Rules

- **Use `add_keyframes_batch`** — one call for many keyframes, not individual calls.
- **NEVER set opacity on elements** — always use animation keyframes for visibility. Element opacity must stay at 100.
- **Set opacity 0 at time 0** via keyframes for elements that appear later.
- **Bound text inherits** container animation — don't animate labels separately.
- **drawProgress** only works on arrows and lines.
- **easeOut** for reveals, **easeInOutCubic** for camera, **easeOutBack** for pop-ins.
- **Call `set_clip_range`** before saving to define export bounds.
- **Use `clear_scene`** to reset everything before building a new animation.
- **Use `delete_items`** to remove elements AND their animations in one call.
- **Verify your work** with `animations_of_item`, `items_visible_in_camera`, `are_items_in_line`, and `is_camera_centered`.

## Easing Choices

| Effect | Easing |
|--------|--------|
| Fade in | `easeOut` |
| Slide in | `easeOutCubic` |
| Pop in | `easeOutBack` |
| Camera motion | `easeInOutCubic` |
| Arrow draw | `easeInOut` |
| Instant | `step` |

## Timing Guidelines

- Fade: 300–800ms
- Arrow draw: 800–1500ms
- Slide: 600–1000ms
- Camera pan: 1500–3000ms
- Stagger delay: 200–500ms
- Reading pause: 1000–2000ms

See [references/REFERENCE.md](references/REFERENCE.md) for complete element format, color palettes, and detailed examples.
