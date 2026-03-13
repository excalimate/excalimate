# Bound Arrows — Connecting Shapes

Bound arrows create persistent connections between shapes. When shapes move, bound arrows stay attached.

---

## Binding Format

### Arrow side

An arrow connects to shapes via `startBinding` and `endBinding`:

```json
{
  "elementId": "targetShapeId",
  "focus": 0,
  "gap": 1
}
```

| Property    | Type     | Description |
|-------------|----------|-------------|
| `elementId` | `string` | ID of the shape to connect to |
| `focus`     | `number` | **-1 to 1** — controls where the arrow aims on the shape edge. `0` = center, `-1` = left/top edge, `1` = right/bottom edge |
| `gap`       | `number` | Pixels between arrow endpoint and shape edge. Use `1` for tight connections. |

### Shape side

Every shape connected to an arrow **must** list that arrow in its `boundElements` array:

```json
"boundElements": [{"id": "arrowId", "type": "arrow"}]
```

---

## Full Example — Three Shapes, Two Arrows

```json
[
  {
    "id": "box_a",
    "type": "rectangle",
    "x": 100,
    "y": 200,
    "width": 160,
    "height": 80,
    "strokeColor": "#1971c2",
    "backgroundColor": "#a5d8ff",
    "fillStyle": "solid",
    "boundElements": [
      {"id": "arrow_ab", "type": "arrow"}
    ]
  },
  {
    "id": "box_b",
    "type": "rectangle",
    "x": 450,
    "y": 200,
    "width": 160,
    "height": 80,
    "strokeColor": "#2f9e44",
    "backgroundColor": "#b2f2bb",
    "fillStyle": "solid",
    "boundElements": [
      {"id": "arrow_ab", "type": "arrow"},
      {"id": "arrow_bc", "type": "arrow"}
    ]
  },
  {
    "id": "box_c",
    "type": "ellipse",
    "x": 800,
    "y": 190,
    "width": 120,
    "height": 100,
    "strokeColor": "#e03131",
    "backgroundColor": "#ffc9c9",
    "fillStyle": "solid",
    "boundElements": [
      {"id": "arrow_bc", "type": "arrow"}
    ]
  },
  {
    "id": "arrow_ab",
    "type": "arrow",
    "x": 261,
    "y": 240,
    "width": 188,
    "height": 0,
    "points": [[0, 0], [188, 0]],
    "endArrowhead": "arrow",
    "startBinding": {"elementId": "box_a", "focus": 0, "gap": 1},
    "endBinding": {"elementId": "box_b", "focus": 0, "gap": 1}
  },
  {
    "id": "arrow_bc",
    "type": "arrow",
    "x": 611,
    "y": 240,
    "width": 188,
    "height": 0,
    "points": [[0, 0], [188, 0]],
    "endArrowhead": "arrow",
    "startBinding": {"elementId": "box_b", "focus": 0, "gap": 1},
    "endBinding": {"elementId": "box_c", "focus": 0, "gap": 1}
  }
]
```

### Positioning the arrow

The arrow's `x` should be placed between the two shapes it connects:
- `x` = right edge of start shape + gap = `startShape.x + startShape.width + gap`
- Arrow `width` = left edge of end shape - arrow x - gap = `endShape.x - arrow.x - gap`

For vertical arrows, apply the same logic to `y` and `height`.

---

## Focus Parameter — Detailed

The `focus` value (-1 to 1) controls which side of the target shape the arrow connects to:

```
focus = -1          focus = 0          focus = 1
  ┌───────┐          ┌───────┐          ┌───────┐
  │       │          │       │          │       │
──┤       │        ──┤   ●   │          │       ├──
  │       │          │       │          │       │
  └───────┘          └───────┘          └───────┘
  (left edge)        (center)           (right edge)
```

- `0`: Arrow aims at the center of the shape (most common).
- Positive values shift toward the right/bottom edge.
- Negative values shift toward the left/top edge.

---

## Multi-Arrow Shapes

A single shape can have multiple arrows bound to it:

```json
{
  "id": "hub",
  "type": "rectangle",
  "x": 400,
  "y": 200,
  "width": 160,
  "height": 80,
  "boundElements": [
    {"id": "arrow_in1", "type": "arrow"},
    {"id": "arrow_in2", "type": "arrow"},
    {"id": "arrow_out1", "type": "arrow"}
  ]
}
```

Each arrow independently uses `startBinding` or `endBinding` referencing `"hub"`.

---

## Common Mistakes

### 1. Forgetting `boundElements` on the shape

❌ **Wrong** — arrow has binding but shape doesn't list it:
```json
// Arrow
{"startBinding": {"elementId": "box1", "focus": 0, "gap": 1}}
// Shape — missing boundElements!
{"id": "box1", "type": "rectangle", ...}
```

✅ **Correct** — both sides reference each other:
```json
// Arrow
{"startBinding": {"elementId": "box1", "focus": 0, "gap": 1}}
// Shape
{"id": "box1", "type": "rectangle", "boundElements": [{"id": "arrow1", "type": "arrow"}], ...}
```

### 2. Wrong `elementId`

The `elementId` in the binding must exactly match the target shape's `id`. Typos silently break bindings.

### 3. Arrow positioned outside the shapes

The arrow's `(x, y)` and points should place it **between** the connected shapes. If the arrow is far away from the shapes, the visual connection will look broken.

### 4. Binding to non-existent elements

If the referenced shape doesn't exist in the scene, the binding is silently ignored. Always ensure all referenced elements are included in the `create_scene` call.
