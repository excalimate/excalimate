# Labeled Shapes — Text Inside Shapes

Place text inside a shape by creating a binding between a container shape and a text element.

---

## Binding Format

### Container shape

Add the text element to the shape's `boundElements` array:

```json
"boundElements": [{"id": "textElementId", "type": "text"}]
```

### Text element

Set these properties on the text element:

| Property        | Value                  | Description |
|-----------------|------------------------|-------------|
| `containerId`   | `"containerShapeId"`   | ID of the parent shape |
| `textAlign`     | `"center"`             | Horizontal alignment within container |
| `verticalAlign` | `"middle"`             | Vertical alignment within container |

---

## Full Example — Labeled Rectangle

```json
[
  {
    "id": "server_box",
    "type": "rectangle",
    "x": 200,
    "y": 150,
    "width": 200,
    "height": 100,
    "strokeColor": "#1971c2",
    "backgroundColor": "#a5d8ff",
    "fillStyle": "solid",
    "roundness": {"type": 3},
    "boundElements": [
      {"id": "server_label", "type": "text"}
    ]
  },
  {
    "id": "server_label",
    "type": "text",
    "x": 245,
    "y": 179,
    "width": 110,
    "height": 42,
    "text": "API\nServer",
    "fontSize": 20,
    "fontFamily": 5,
    "textAlign": "center",
    "verticalAlign": "middle",
    "containerId": "server_box"
  }
]
```

---

## Positioning the Label

Center the text inside the shape:

```
text.x = shape.x + (shape.width  - text.width)  / 2
text.y = shape.y + (shape.height - text.height) / 2
```

For the example above:
- `text.x = 200 + (200 - 110) / 2 = 245`
- `text.y = 150 + (100 - 42) / 2 = 179`

### Text sizing reminder

- **Width**: `fontSize * longestLineLength * 0.6`
- **Height**: `fontSize * 1.35 * numberOfLines`

For `"API\nServer"` with `fontSize: 20`:
- Longest line: `"Server"` = 6 characters → `width = 20 * 6 * 0.6 = 72` (round up to ~110 for padding)
- Two lines → `height = 20 * 1.35 * 2 = 54` (approximate, ~42 in practice)

---

## Labeled Shapes with Bound Arrows

A shape can have both a label and bound arrows. List them all in `boundElements`:

```json
{
  "id": "process_box",
  "type": "rectangle",
  "x": 300,
  "y": 200,
  "width": 180,
  "height": 80,
  "strokeColor": "#2f9e44",
  "backgroundColor": "#b2f2bb",
  "fillStyle": "solid",
  "boundElements": [
    {"id": "process_label", "type": "text"},
    {"id": "arrow_in", "type": "arrow"},
    {"id": "arrow_out", "type": "arrow"}
  ]
}
```

---

## Animation Rules

**Bound text inherits the container's animation.** Do not animate labels separately.

When you add keyframes to a container shape (e.g., fade in, slide, scale), the bound text automatically follows. Animating the text independently can cause visual desynchronization.

✅ **Correct**: Animate only the container shape.
```
add_keyframes_batch: [
  {"elementId": "server_box", "time": 0, "opacity": 0},
  {"elementId": "server_box", "time": 500, "opacity": 1}
]
```

❌ **Wrong**: Animating the label separately.
```
add_keyframes_batch: [
  {"elementId": "server_box", "time": 0, "opacity": 0},
  {"elementId": "server_box", "time": 500, "opacity": 1},
  {"elementId": "server_label", "time": 0, "opacity": 0},
  {"elementId": "server_label", "time": 500, "opacity": 1}
]
```

---

## Multiple Lines vs Multiple Labels

Use **newlines** (`\n`) for multi-line text within a single label — do not create multiple text elements for one shape.

```json
{
  "id": "multi_label",
  "type": "text",
  "text": "Database\nPostgreSQL\nv15.2",
  "fontSize": 16,
  "containerId": "db_box",
  "textAlign": "center",
  "verticalAlign": "middle"
}
```

Excalidraw supports only **one bound text element per container**. If you need visually separate text blocks, use standalone text elements positioned near (but not bound to) the shape.

---

## Supported Container Types

These shape types can contain bound text:

- `rectangle` ✅
- `ellipse` ✅
- `diamond` ✅
- `arrow` ✅ (for arrow labels)

Frames and lines **cannot** contain bound text.
