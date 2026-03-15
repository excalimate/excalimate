---
name: excalimate-core
description: >
  Master reference for Excalidraw element JSON format used by the Excalimate MCP server.
  Use when creating any diagram — rectangles, ellipses, diamonds, text, arrows, lines,
  bound arrows connecting shapes, labeled shapes with text inside, and element grouping.
  Covers coordinate system, required vs auto-filled properties, color palettes, and
  font options. Essential foundation for all Excalimate diagram creation.
---

# Excalimate Core — Excalidraw Element Reference

## Workflow

1. **Call `read_me`** to get element format guidance (optional if this skill is loaded).
2. **Call `clear_scene`** to reset the canvas.
3. **Call `create_scene`** with an array of Excalidraw element JSON objects.
4. **Verify** the scene:
   - `get_scene` — inspect current elements
   - `are_items_in_line` — check alignment
   - `is_camera_centered` — confirm viewport
   - `items_visible_in_camera` — ensure nothing is off-screen
5. **Call `set_clip_range`** to define the export region.
6. **Call `save_checkpoint`** to persist the scene state.
7. **Call `share_project`** to get an E2E encrypted URL you can share with others.

---

## Coordinate System

- **Origin (0, 0)** is the **top-left** of the canvas.
- **X increases rightward**, **Y increases downward**.
- An element's `x` and `y` define the **top-left corner** of its bounding box.
- `width` and `height` define the bounding box size.
- **Typical diagram canvas**: 0–2000 (x) × 0–1500 (y).

---

## Required vs Auto-filled Properties

### Required on every element

| Property | Description |
|----------|-------------|
| `id`     | Unique string identifier |
| `type`   | Element type (`rectangle`, `ellipse`, `diamond`, `text`, `arrow`, `line`, `freedraw`, `frame`) |
| `x`      | Left edge of bounding box |
| `y`      | Top edge of bounding box |
| `width`  | Bounding box width |
| `height` | Bounding box height |

### Auto-filled defaults (omit to use defaults)

| Property          | Default         |
|-------------------|-----------------|
| `strokeColor`     | `#1e1e1e`       |
| `backgroundColor` | `transparent`   |
| `fillStyle`       | `solid`         |
| `strokeWidth`     | `2`             |
| `roughness`       | `1`             |
| `opacity`         | `100`           |
| `angle`           | `0`             |
| `groupIds`        | `[]`            |
| `seed`            | auto-generated  |
| `version`         | auto-managed    |

> **CRITICAL**: Never set `opacity` on elements. Always use animation keyframes for visibility control. Element opacity must remain at **100**.

---

## Quick Element Catalog

### Rectangle

```json
{"id":"r1","type":"rectangle","x":100,"y":100,"width":200,"height":100,"strokeColor":"#1971c2","backgroundColor":"#a5d8ff","fillStyle":"solid"}
```

### Ellipse

```json
{"id":"e1","type":"ellipse","x":300,"y":100,"width":120,"height":120,"strokeColor":"#e03131","backgroundColor":"#ffc9c9","fillStyle":"solid"}
```

### Diamond

```json
{"id":"d1","type":"diamond","x":500,"y":90,"width":140,"height":140,"strokeColor":"#6741d9","backgroundColor":"#d0bfff","fillStyle":"solid"}
```

### Text

```json
{"id":"t1","type":"text","x":200,"y":50,"width":300,"height":50,"text":"Title","fontSize":36,"fontFamily":5,"textAlign":"center"}
```

| Property        | Values |
|-----------------|--------|
| `fontFamily`    | `1` = Virgil (hand-drawn), `3` = Cascadia (mono), `5` = Assistant (clean sans-serif) |
| `textAlign`     | `"left"` \| `"center"` \| `"right"` |
| `verticalAlign` | `"top"` \| `"middle"` |

### Arrow

```json
{"id":"a1","type":"arrow","x":100,"y":200,"width":300,"height":0,"points":[[0,0],[300,0]],"endArrowhead":"arrow"}
```

- `points`: Array of `[x, y]` pairs **relative to element position**. First point is always `[0, 0]`.
- Arrowheads: `null` | `"arrow"` | `"bar"` | `"dot"` | `"triangle"`

### Curved Arrow

```json
{"id":"c1","type":"arrow","x":100,"y":200,"width":300,"height":100,"points":[[0,0],[150,-100],[300,0]],"endArrowhead":"arrow"}
```

### Line

```json
{"id":"l1","type":"line","x":100,"y":300,"width":400,"height":80,"points":[[0,0],[200,-80],[400,0]]}
```

---

## Bound Arrows (Connecting Shapes)

Arrows can be **bound** to shapes so they visually connect and stay attached.

- Arrow needs `startBinding` and/or `endBinding`: `{"elementId":"shapeId","focus":0,"gap":1}`
- **Both** connected shapes need `boundElements:[{"id":"arrowId","type":"arrow"}]`

> See [references/bound-arrows.md](references/bound-arrows.md) for full examples, focus/gap details, and common mistakes.

---

## Labeled Shapes (Text Inside Shapes)

Place text inside a shape by binding them together.

- Shape gets `boundElements:[{"id":"labelId","type":"text"}]`
- Text gets `containerId:"shapeId"`, `textAlign:"center"`, `verticalAlign:"middle"`

> See [references/labeled-shapes.md](references/labeled-shapes.md) for positioning formulas and animation rules.

---

## Color Palette

### Stroke Colors

| Color  | Hex       |
|--------|-----------|
| Black  | `#1e1e1e` |
| Red    | `#e03131` |
| Green  | `#2f9e44` |
| Blue   | `#1971c2` |
| Orange | `#f08c00` |
| Purple | `#6741d9` |
| Teal   | `#0c8599` |
| Coral  | `#e8590c` |

### Background Colors

| Color        | Hex         |
|--------------|-------------|
| Transparent  | `transparent` |
| Light Red    | `#ffc9c9`   |
| Light Green  | `#b2f2bb`   |
| Light Blue   | `#a5d8ff`   |
| Light Yellow | `#ffec99`   |
| Light Purple | `#d0bfff`   |
| Light Teal   | `#99e9f2`   |
| Light Orange | `#ffd8a8`   |

---

## Key Rules

- Use **`add_keyframes_batch`** for animations — one call, many keyframes.
- Use **`add_scale_animation`** when you need anchored scaling from an edge/corner/center.
- **NEVER** set `opacity` on elements — always use keyframes for visibility.
- Use **`delete_items`** to remove elements **and** their animations.
- Call **`set_clip_range`** before saving.
- Verify layout with **`are_items_in_line`**, **`is_camera_centered`**, and **`items_visible_in_camera`**.
- Keep element `id` values short and descriptive (e.g., `"box1"`, `"arrow_a_b"`, `"title"`).

---

## Reference Files

| File | Content |
|------|---------|
| [references/element-schemas.md](references/element-schemas.md) | Full property schemas for every element type |
| [references/bound-arrows.md](references/bound-arrows.md) | Deep dive into connecting arrows to shapes |
| [references/labeled-shapes.md](references/labeled-shapes.md) | Deep dive into text-inside-shapes |
| [references/grouping.md](references/grouping.md) | Element grouping and frame-based hierarchy |
