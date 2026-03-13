# Diff Highlighting

Color conventions, stroke rules, and animation patterns for visually communicating
what changed between two states.

## Color Palette

### Additions (new elements in State B)

| Property          | Value     | Usage                        |
|------------------|-----------|------------------------------|
| `strokeColor`    | `#2f9e44` | Green border                 |
| `backgroundColor`| `#b2f2bb` | Light green fill             |
| `strokeWidth`    | 3–4       | Thick border for visibility  |
| `fillStyle`      | `"solid"` | Solid fill for contrast      |

```json
{
  "id": "added-service",
  "type": "rectangle",
  "x": 900, "y": 200, "width": 180, "height": 80,
  "strokeColor": "#2f9e44",
  "backgroundColor": "#b2f2bb",
  "fillStyle": "solid",
  "strokeWidth": 3,
  "roundness": { "type": 3 }
}
```

### Removals (elements only in State A)

| Property          | Value     | Usage                        |
|------------------|-----------|------------------------------|
| `strokeColor`    | `#e03131` | Red border                   |
| `backgroundColor`| `#ffc9c9` | Light red fill               |
| `strokeWidth`    | 3–4       | Thick border for visibility  |
| `fillStyle`      | `"solid"` | Solid fill for contrast      |

```json
{
  "id": "removed-monolith",
  "type": "rectangle",
  "x": 100, "y": 200, "width": 250, "height": 160,
  "strokeColor": "#e03131",
  "backgroundColor": "#ffc9c9",
  "fillStyle": "solid",
  "strokeWidth": 3,
  "roundness": { "type": 3 }
}
```

### Changes (modified elements present in both states)

| Property          | Value     | Usage                        |
|------------------|-----------|------------------------------|
| `strokeColor`    | `#f08c00` | Orange border                |
| `backgroundColor`| `#ffec99` | Light yellow fill            |
| `strokeWidth`    | 3–4       | Thick border for visibility  |
| `fillStyle`      | `"solid"` | Solid fill for contrast      |

```json
{
  "id": "changed-db",
  "type": "rectangle",
  "x": 300, "y": 450, "width": 150, "height": 80,
  "strokeColor": "#f08c00",
  "backgroundColor": "#ffec99",
  "fillStyle": "solid",
  "strokeWidth": 3,
  "roundness": { "type": 3 }
}
```

### Unchanged (identical in both states)

| Property          | Value     | Usage                        |
|------------------|-----------|------------------------------|
| `strokeColor`    | `#868e96` | Gray border                  |
| `backgroundColor`| `#e9ecef` | Light gray fill              |
| `strokeWidth`    | 1–2       | Thin — not the focus         |
| `fillStyle`      | `"solid"` | Or keep original styling     |

> Unchanged elements can retain their original colors if the diagram has a pre-existing
> color scheme. Use gray only when starting from scratch or when you want maximum
> contrast with diff-highlighted elements.

## Stroke Width Rules

| Element status | Stroke width | Rationale                              |
|---------------|-------------|----------------------------------------|
| Addition      | 3–4 px      | Must stand out as new                  |
| Removal       | 3–4 px      | Must stand out as removed              |
| Change        | 3–4 px      | Must stand out as modified             |
| Unchanged     | 1–2 px      | Recedes into background                |
| Labels/text   | —           | Use color on background rect instead   |
| Arrows        | 3–4 px      | Match the status of the connected node |

## Highlight Animation Patterns

### Pulse (attention-grab)

Scale an element up slightly and back to draw the viewer's eye. Apply to each
differing element sequentially with 400–600 ms spacing.

```json
[
  {
    "elementId": "changed-element",
    "property": "scaleX",
    "keyframes": [
      { "time": 1500, "value": 1, "easing": "easeInOutQuad" },
      { "time": 1750, "value": 1.06 },
      { "time": 2000, "value": 1, "easing": "easeInOutQuad" }
    ]
  },
  {
    "elementId": "changed-element",
    "property": "scaleY",
    "keyframes": [
      { "time": 1500, "value": 1, "easing": "easeInOutQuad" },
      { "time": 1750, "value": 1.06 },
      { "time": 2000, "value": 1, "easing": "easeInOutQuad" }
    ]
  }
]
```

### Fade-Flash (soft highlight)

Briefly reduce opacity and restore to create a "flash" effect.

```json
[
  {
    "elementId": "diff-element",
    "property": "opacity",
    "keyframes": [
      { "time": 1500, "value": 1, "easing": "easeInOutQuad" },
      { "time": 1700, "value": 0.4 },
      { "time": 1900, "value": 1, "easing": "easeInOutQuad" },
      { "time": 2100, "value": 0.4 },
      { "time": 2300, "value": 1, "easing": "easeInOutQuad" }
    ]
  }
]
```

### Sequential Stagger

When highlighting multiple differences, stagger them so each gets a moment of focus.

```json
[
  { "elementId": "diff-1", "property": "scaleX", "keyframes": [
    { "time": 1500, "value": 1 }, { "time": 1750, "value": 1.06 }, { "time": 2000, "value": 1 }
  ]},
  { "elementId": "diff-1", "property": "scaleY", "keyframes": [
    { "time": 1500, "value": 1 }, { "time": 1750, "value": 1.06 }, { "time": 2000, "value": 1 }
  ]},
  { "elementId": "diff-2", "property": "scaleX", "keyframes": [
    { "time": 2100, "value": 1 }, { "time": 2350, "value": 1.06 }, { "time": 2600, "value": 1 }
  ]},
  { "elementId": "diff-2", "property": "scaleY", "keyframes": [
    { "time": 2100, "value": 1 }, { "time": 2350, "value": 1.06 }, { "time": 2600, "value": 1 }
  ]},
  { "elementId": "diff-3", "property": "scaleX", "keyframes": [
    { "time": 2700, "value": 1 }, { "time": 2950, "value": 1.06 }, { "time": 3200, "value": 1 }
  ]},
  { "elementId": "diff-3", "property": "scaleY", "keyframes": [
    { "time": 2700, "value": 1 }, { "time": 2950, "value": 1.06 }, { "time": 3200, "value": 1 }
  ]}
]
```

> **Spacing rule:** 500–600 ms between each element's pulse start time gives the
> viewer enough time to shift focus without feeling rushed.

## Applying Diff Colors to Arrows

Arrows inherit the diff status of the relationship they represent:

- **New connection** → green arrow (`strokeColor: "#2f9e44"`, `strokeWidth: 3`)
- **Removed connection** → red arrow (`strokeColor: "#e03131"`, `strokeWidth: 3`)
- **Changed route** → orange arrow (`strokeColor: "#f08c00"`, `strokeWidth: 3`)
- **Unchanged connection** → gray arrow (`strokeColor: "#868e96"`, `strokeWidth: 1`)

For `drawProgress` animations on diff arrows, reveal them **after** the connected
nodes are visible to maintain visual logic.
