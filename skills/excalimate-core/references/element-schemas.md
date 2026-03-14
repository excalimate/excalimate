# Element Schemas — Full Property Reference

Complete property definitions for every Excalidraw element type supported by the Excalimate MCP server.

---

## Common Properties (All Elements)

Every element **must** include these properties:

| Property | Type     | Required | Description |
|----------|----------|----------|-------------|
| `id`     | `string` | ✅ Yes   | Unique identifier. Keep short and descriptive. |
| `type`   | `string` | ✅ Yes   | One of: `rectangle`, `ellipse`, `diamond`, `text`, `arrow`, `line`, `freedraw`, `frame` |
| `x`      | `number` | ✅ Yes   | X position of bounding box top-left corner |
| `y`      | `number` | ✅ Yes   | Y position of bounding box top-left corner |
| `width`  | `number` | ✅ Yes   | Bounding box width (must be > 0) |
| `height` | `number` | ✅ Yes   | Bounding box height (must be > 0) |

### Optional common properties (auto-filled if omitted)

| Property          | Type       | Default         | Description |
|-------------------|------------|-----------------|-------------|
| `strokeColor`     | `string`   | `"#1e1e1e"`     | Border/stroke color (hex) |
| `backgroundColor` | `string`   | `"transparent"` | Fill color (hex or `"transparent"`) |
| `fillStyle`       | `string`   | `"solid"`       | Fill pattern: `"solid"`, `"hachure"`, `"cross-hatch"` |
| `strokeWidth`     | `number`   | `2`             | Stroke thickness in pixels: `1` (thin), `2` (normal), `4` (thick) |
| `strokeStyle`     | `string`   | `"solid"`       | Stroke style: `"solid"`, `"dashed"`, `"dotted"` |
| `roughness`       | `number`   | `1`             | Hand-drawn effect: `0` (none), `1` (normal), `2` (heavy) |
| `opacity`         | `number`   | `100`           | **DO NOT SET** — always leave at 100. Use animation keyframes for visibility. |
| `angle`           | `number`   | `0`             | Rotation in radians |
| `groupIds`        | `string[]` | `[]`            | Array of group IDs this element belongs to |
| `boundElements`   | `array`    | `null`          | Array of `{id, type}` for bound arrows/text |
| `seed`            | `number`   | auto            | Random seed for hand-drawn rendering |
| `version`         | `number`   | auto            | Version counter, auto-managed |
| `roundness`       | `object`   | `null`          | `{"type": 3}` for rounded corners on shapes |

---

## Rectangle

Standard rectangular shape.

```json
{
  "id": "rect1",
  "type": "rectangle",
  "x": 100,
  "y": 100,
  "width": 200,
  "height": 100,
  "strokeColor": "#1971c2",
  "backgroundColor": "#a5d8ff",
  "fillStyle": "solid",
  "roundness": {"type": 3}
}
```

- `roundness`: Set `{"type": 3}` for rounded corners, omit or `null` for sharp corners.

---

## Ellipse

Oval/circle shape. The bounding box defines the ellipse extents.

```json
{
  "id": "ell1",
  "type": "ellipse",
  "x": 300,
  "y": 100,
  "width": 120,
  "height": 120,
  "strokeColor": "#e03131",
  "backgroundColor": "#ffc9c9",
  "fillStyle": "solid"
}
```

- For a perfect circle, set `width` equal to `height`.
- Center of the ellipse is at `(x + width/2, y + height/2)`.

---

## Diamond

Rotated square / rhombus shape.

```json
{
  "id": "dia1",
  "type": "diamond",
  "x": 500,
  "y": 90,
  "width": 140,
  "height": 140,
  "strokeColor": "#6741d9",
  "backgroundColor": "#d0bfff",
  "fillStyle": "solid"
}
```

- The diamond is inscribed within the bounding box.
- Visual center is at `(x + width/2, y + height/2)`.
- The points of the diamond touch the midpoints of each bounding box edge.

---

## Text

Standalone or bound text element.

```json
{
  "id": "txt1",
  "type": "text",
  "x": 200,
  "y": 50,
  "width": 300,
  "height": 50,
  "text": "Hello World",
  "fontSize": 28,
  "fontFamily": 5,
  "textAlign": "center"
}
```

### Text-specific properties

| Property        | Type     | Default    | Values |
|-----------------|----------|------------|--------|
| `text`          | `string` | ✅ Required | The text content. Use `\n` for newlines. |
| `fontSize`      | `number` | `20`       | Size in pixels. Common: `16`, `20`, `28`, `36`, `48` |
| `fontFamily`    | `number` | `1`        | `1` = Virgil (hand-drawn), `3` = Cascadia (mono), `5` = Assistant (sans-serif) |
| `textAlign`     | `string` | `"left"`   | `"left"`, `"center"`, `"right"` |
| `verticalAlign` | `string` | `"top"`    | `"top"`, `"middle"` |
| `containerId`   | `string` | `null`     | ID of parent shape (for labeled shapes) |
| `lineHeight`    | `number` | `1.25`     | Line height multiplier |

### Text sizing approximation

Excalidraw requires explicit `width` and `height`. Approximate them:

- **Width**: `fontSize * text.length * 0.6` (for single line)
- **Height**: `fontSize * 1.35 * numberOfLines`

For multi-line text, calculate based on the longest line:
```
longestLineLength = max(line.length for each line)
width  = fontSize * longestLineLength * 0.6
height = fontSize * 1.35 * numberOfLines
```

These are approximations — the actual rendering may differ slightly.

---

## Arrow

Linear or curved arrow with optional arrowheads and bindings.

```json
{
  "id": "arr1",
  "type": "arrow",
  "x": 100,
  "y": 200,
  "width": 300,
  "height": 0,
  "points": [[0, 0], [300, 0]],
  "startArrowhead": null,
  "endArrowhead": "arrow",
  "startBinding": null,
  "endBinding": null
}
```

### Arrow-specific properties

| Property          | Type           | Default | Description |
|-------------------|----------------|---------|-------------|
| `points`          | `number[][]`   | ✅ Required | Array of `[x, y]` relative to element position |
| `startArrowhead`  | `string\|null` | `null`  | `null`, `"arrow"`, `"bar"`, `"dot"`, `"triangle"` |
| `endArrowhead`    | `string\|null` | `null`  | Same options as startArrowhead |
| `startBinding`    | `object\|null` | `null`  | `{elementId, focus, gap}` — binds start to a shape |
| `endBinding`      | `object\|null` | `null`  | `{elementId, focus, gap}` — binds end to a shape |

### Arrow gotchas

- **First point must be `[0, 0]`**. All other points are relative to the arrow's `(x, y)`.
- **`width` should match the x-span** of points: `max(px) - min(px)`.
- **`height` should match the y-span** of points: `max(py) - min(py)`.
- For a straight horizontal arrow: `points: [[0,0],[300,0]]`, `width: 300`, `height: 0`.
- For a curved arrow, add intermediate points: `points: [[0,0],[150,-80],[300,0]]`.
- Arrow position `(x, y)` is the location of the first point `[0, 0]` on the canvas.

---

## Line

Like an arrow but without arrowhead support. Used for decorative lines, dividers, paths.

```json
{
  "id": "line1",
  "type": "line",
  "x": 100,
  "y": 300,
  "width": 400,
  "height": 80,
  "points": [[0, 0], [200, -80], [400, 0]]
}
```

### Line-specific properties

| Property | Type         | Default     | Description |
|----------|--------------|-------------|-------------|
| `points` | `number[][]` | ✅ Required | Array of `[x, y]` relative to element position |

- Same coordinate rules as arrows — first point is `[0, 0]`.
- Lines do **not** support `startBinding` / `endBinding`.
- Lines do **not** support arrowheads.

---

## Freedraw

Freehand drawn path.

```json
{
  "id": "fd1",
  "type": "freedraw",
  "x": 50,
  "y": 400,
  "width": 200,
  "height": 100,
  "points": [[0, 0], [10, 5], [20, 3], [50, 40], [100, 80], [200, 100]],
  "strokeColor": "#1e1e1e",
  "strokeWidth": 2
}
```

- `points` are relative to `(x, y)`, first point at `[0, 0]`.
- `width` / `height` should encompass all points.
- Typically generated programmatically rather than hand-authored.

---

## Frame

Container frame that visually groups elements. Children are elements whose bounding boxes overlap the frame.

```json
{
  "id": "frame1",
  "type": "frame",
  "x": 50,
  "y": 50,
  "width": 500,
  "height": 400,
  "name": "Architecture"
}
```

### Frame-specific properties

| Property | Type     | Default | Description |
|----------|----------|---------|-------------|
| `name`   | `string` | `null`  | Display name shown on the frame border |

- Frames do not have `backgroundColor` or `fillStyle` — they are transparent containers.
- Elements inside the frame bounds are considered children.
- See [grouping.md](grouping.md) for details on grouping and animation cascading.
