# Grouping — Frames, Group IDs, and Animation Cascading

Elements can be grouped visually and logically for coordinated layout and animation.

---

## Excalidraw Frames

Frames are container elements that visually group children by spatial overlap.

```json
{
  "id": "f1",
  "type": "frame",
  "x": 50,
  "y": 50,
  "width": 500,
  "height": 400,
  "name": "Group A"
}
```

| Property | Type     | Description |
|----------|----------|-------------|
| `name`   | `string` | Display name shown on frame border |

- Frames are transparent — no fill or stroke styling.
- Any element whose bounding box overlaps the frame is considered a child.
- Frames are useful for organizing sections of a diagram (e.g., "Frontend", "Backend", "Database").

### Frame example

```json
[
  {
    "id": "frame_frontend",
    "type": "frame",
    "x": 50,
    "y": 50,
    "width": 400,
    "height": 300,
    "name": "Frontend"
  },
  {
    "id": "react_box",
    "type": "rectangle",
    "x": 80,
    "y": 100,
    "width": 150,
    "height": 70,
    "strokeColor": "#1971c2",
    "backgroundColor": "#a5d8ff",
    "fillStyle": "solid"
  },
  {
    "id": "vue_box",
    "type": "rectangle",
    "x": 270,
    "y": 100,
    "width": 150,
    "height": 70,
    "strokeColor": "#2f9e44",
    "backgroundColor": "#b2f2bb",
    "fillStyle": "solid"
  }
]
```

Both `react_box` and `vue_box` are inside the `frame_frontend` bounds, so they are children.

---

## Logical Group IDs

Elements sharing the same `groupIds` value are logically grouped. This is a visual grouping mechanism — grouped elements are selected and moved together in the Excalidraw UI.

```json
{
  "id": "icon1",
  "type": "ellipse",
  "x": 100,
  "y": 100,
  "width": 40,
  "height": 40,
  "groupIds": ["g_header"]
}
```

```json
{
  "id": "title1",
  "type": "text",
  "x": 150,
  "y": 105,
  "width": 200,
  "height": 30,
  "text": "Header Section",
  "fontSize": 20,
  "fontFamily": 5,
  "groupIds": ["g_header"]
}
```

### Nested groups

Elements can belong to multiple groups (nested hierarchy):

```json
"groupIds": ["g_inner", "g_outer"]
```

The first ID is the innermost group. This creates a group-within-a-group structure.

---

## Animation Group Hierarchy

When a parent group or frame has animation keyframes, transforms cascade to all children.

### Cascade rules

| Transform   | Cascade Behavior         |
|-------------|--------------------------|
| Translation | Parent + Child (additive) |
| Scale       | Parent × Child (multiplicative) |
| Opacity     | Parent × Child (multiplicative) |
| Rotation    | Parent + Child (additive) |

### Example — Group fade-in

If a frame `f1` fades from opacity 0 to 1, all children inside `f1` also fade in together:

```
add_keyframes_batch: [
  {"elementId": "f1", "time": 0, "opacity": 0},
  {"elementId": "f1", "time": 1000, "opacity": 1}
]
```

All elements within `f1` will go from invisible to visible over 1 second, without needing individual keyframes.

### Example — Staggered reveal within a group

Animate the parent for shared movement, then add individual element keyframes for staggered timing:

```
add_keyframes_batch: [
  {"elementId": "f1", "time": 0, "opacity": 0, "translateY": 50},
  {"elementId": "f1", "time": 1000, "opacity": 1, "translateY": 0},

  {"elementId": "child_a", "time": 0, "opacity": 0},
  {"elementId": "child_a", "time": 500, "opacity": 1},

  {"elementId": "child_b", "time": 200, "opacity": 0},
  {"elementId": "child_b", "time": 700, "opacity": 1},

  {"elementId": "child_c", "time": 400, "opacity": 0},
  {"elementId": "child_c", "time": 900, "opacity": 1}
]
```

The frame slides up while children fade in one by one with 200ms stagger.

---

## Best Practices

### Use groups for coordinated movement
When multiple elements should move, scale, or fade together, put them in a frame or shared groupIds and animate the container.

### Use individual keyframes for staggered reveals
For sequential appearance effects, animate each element with offset timings.

### Combine both for complex animations
- Frame animation handles the shared transform (e.g., slide in from left).
- Individual element keyframes handle the stagger (e.g., each child fades in 200ms apart).

### Avoid animating bound text
Bound text (labels inside shapes) inherits the container's animation. Do not add keyframes to bound text elements — animate only the container shape.

### Keep group IDs descriptive
Use meaningful group IDs like `"g_header"`, `"g_flow_step1"`, `"g_legend"` rather than generic names.

---

## Frames vs Group IDs — When to Use Which

| Feature | Frames | Group IDs |
|---------|--------|-----------|
| Visual boundary | ✅ Shows border + name | ❌ No visual indicator |
| Membership | Spatial overlap | Explicit `groupIds` array |
| Animation target | Can animate frame directly | Animate individual elements |
| Nesting | Frames can contain frames | Groups can be nested via array |
| Use case | Diagram sections, layout regions | Logically related elements |

In general:
- Use **frames** when you want visible section boundaries and spatial grouping.
- Use **groupIds** when you want invisible logical grouping for selection/animation purposes.
